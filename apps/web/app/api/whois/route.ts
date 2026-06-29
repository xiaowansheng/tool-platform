import { NextRequest, NextResponse } from "next/server";
import net from "node:net";

const TLD_WHOIS_SERVERS: Record<string, string> = {
  com: "whois.verisign-grs.com",
  net: "whois.verisign-grs.com",
  org: "whois.pir.org",
  cn: "whois.cnnic.cn",
  io: "whois.nic.io",
  me: "whois.nic.me",
  co: "whois.nic.co",
  cc: "whois.nic.cc",
  info: "whois.afilias.net",
  biz: "whois.nic.biz",
  mobi: "whois.nic.mobi",
  app: "whois.nic.google",
  dev: "whois.nic.google",
  so: "whois.nic.so",
  hk: "whois.hkirc.hk"
};

function queryWhoisServer(server: string, query: string, timeout = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let response = "";
    let isResolved = false;

    socket.connect(43, server, () => {
      socket.write(query + "\r\n");
    });

    socket.on("data", (chunk) => {
      response += chunk.toString("utf8");
    });

    socket.on("end", () => {
      if (isResolved) return;
      isResolved = true;
      resolve(response);
      socket.destroy();
    });

    socket.on("error", (err) => {
      if (isResolved) return;
      isResolved = true;
      reject(err);
      socket.destroy();
    });

    setTimeout(() => {
      if (isResolved) return;
      isResolved = true;
      reject(new Error(`向 WHOIS 服务器 ${server} 查询超时`));
      socket.destroy();
    }, timeout);
  });
}

function parseWhois(rawText: string) {
  const findValue = (regexes: RegExp[]): string => {
    for (const regex of regexes) {
      const match = rawText.match(regex);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return "";
  };

  const findValues = (regex: RegExp): string[] => {
    const matches: string[] = [];
    let match;
    const rx = new RegExp(regex.source, regex.flags + "g");
    while ((match = rx.exec(rawText)) !== null) {
      if (match[1]) matches.push(match[1].trim());
    }
    return Array.from(new Set(matches));
  };

  const registrar = findValue([
    /registrar:\s*(.+)/i,
    /sponsoring registrar:\s*(.+)/i,
    /registration service provider:\s*(.+)/i
  ]);

  const createdDate = findValue([
    /creation date:\s*(.+)/i,
    /created on:\s*(.+)/i,
    /registration time:\s*(.+)/i,
    /registered on:\s*(.+)/i
  ]);

  const expiryDate = findValue([
    /registry expiry date:\s*(.+)/i,
    /expiration date:\s*(.+)/i,
    /expiration time:\s*(.+)/i,
    /registrar registration expiration date:\s*(.+)/i
  ]);

  const nameServers = findValues(/name server:\s*([a-zA-Z0-9.-]+)/i);
  const status = findValues(/domain status:\s*([a-zA-Z\s]+)/i);

  return {
    registrar: registrar || "未知",
    createdDate: createdDate || "未知",
    expiryDate: expiryDate || "未知",
    nameServers: nameServers.length > 0 ? nameServers : ["未知"],
    status: status.length > 0 ? status : ["未知"]
  };
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const { domain } = json as { domain?: string };

    if (!domain) {
      return NextResponse.json({ error: "Missing domain query" }, { status: 400 });
    }

    const cleanDomain = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .split(":")[0];

    if (!cleanDomain.includes(".")) {
      return NextResponse.json({ error: "无效的域名格式" }, { status: 400 });
    }

    const parts = cleanDomain.split(".");
    const tld = parts[parts.length - 1];

    let whoisServer = TLD_WHOIS_SERVERS[tld];
    let rawResult = "";

    try {
      if (!whoisServer) {
        // Query root WHOIS iana server first to discover TLD registry server
        const rootResult = await queryWhoisServer("whois.iana.org", cleanDomain);
        const referMatch = rootResult.match(/refer:\s*(.+)/i) || rootResult.match(/whois:\s*(.+)/i);
        if (referMatch && referMatch[1]) {
          whoisServer = referMatch[1].trim();
        } else {
          whoisServer = "whois.iana.org"; // Fallback to IANA if no referral
        }
      }

      // Query TLD registry WHOIS server
      rawResult = await queryWhoisServer(whoisServer, cleanDomain);
    } catch (queryErr) {
      // Fallback: try querying whois.iana.org directly
      try {
        rawResult = await queryWhoisServer("whois.iana.org", cleanDomain);
      } catch {
        throw new Error(`查询 WHOIS 服务器 ${whoisServer || "IANA"} 失败: ${(queryErr as Error).message}`);
      }
    }

    const parsed = parseWhois(rawResult);

    return NextResponse.json({
      success: true,
      domain: cleanDomain,
      server: whoisServer,
      parsed,
      raw: rawResult
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "WHOIS 查询失败" },
      { status: 500 }
    );
  }
}
