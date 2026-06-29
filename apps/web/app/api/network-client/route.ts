import { NextRequest, NextResponse } from "next/server";
import net from "node:net";
import dgram from "node:dgram";
import dns from "node:dns";

// Helpers to convert payload formats
function parsePayload(payload: string, type: string): Buffer {
  if (type === "hex") {
    const cleanHex = payload.replace(/\s+|0x/g, "");
    if (!/^[0-9a-fA-F]*$/.test(cleanHex)) {
      throw new Error("十六进制字符串包含非法字符 (只能包含 0-9, a-f, A-F)");
    }
    if (cleanHex.length % 2 !== 0) {
      throw new Error("十六进制字符串长度必须是偶数");
    }
    return Buffer.from(cleanHex, "hex");
  }
  if (type === "base64") {
    const cleanB64 = payload.trim();
    try {
      // Validate Base64
      atob(cleanB64);
    } catch {
      throw new Error("无效的 Base64 编码格式");
    }
    return Buffer.from(cleanB64, "base64");
  }
  return Buffer.from(payload); // default text
}

function formatResponse(buf: Buffer): { text: string; hex: string; base64: string } {
  // Try to decode as UTF-8
  let text = "";
  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    text = decoder.decode(buf);
  } catch {
    text = "[Binary data, UTF-8 decode failed]";
  }

  return {
    text,
    hex: buf.toString("hex").match(/.{1,2}/g)?.join(" ") || buf.toString("hex"),
    base64: buf.toString("base64")
  };
}

// TCP Send-and-Receive handler with snappier inactivity timeout (silence detection)
function tcpSend(
  host: string,
  port: number,
  payloadBuffer: Buffer,
  timeoutMs: number
): Promise<{ data: Buffer; elapsed: number }> {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const client = new net.Socket();
    const dataChunks: Buffer[] = [];
    let isResolved = false;
    let inactivityTimer: NodeJS.Timeout | null = null;

    const cleanupAndResolve = (err?: Error) => {
      if (isResolved) return;
      isResolved = true;
      
      if (inactivityTimer) clearTimeout(inactivityTimer);
      clearTimeout(timer);
      client.destroy();

      const elapsed = Math.round(performance.now() - startTime);
      if (err) {
        reject(err);
      } else {
        resolve({ data: Buffer.concat(dataChunks), elapsed });
      }
    };

    const resetInactivityTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      // If server stops sending data for 300ms, assume response complete
      inactivityTimer = setTimeout(() => {
        cleanupAndResolve();
      }, 300);
    };

    client.connect(port, host, () => {
      client.write(payloadBuffer);
    });

    client.on("data", (chunk) => {
      dataChunks.push(chunk);
      resetInactivityTimer();
    });

    client.on("end", () => {
      cleanupAndResolve();
    });

    client.on("error", (err) => {
      cleanupAndResolve(err);
    });

    const timer = setTimeout(() => {
      if (dataChunks.length > 0) {
        cleanupAndResolve();
      } else {
        cleanupAndResolve(new Error(`TCP 连接超时 (${timeoutMs}ms) 且无任何响应`));
      }
    }, timeoutMs);
  });
}

// UDP Send-and-Receive handler with silence detection
function udpSend(
  host: string,
  port: number,
  payloadBuffer: Buffer,
  timeoutMs: number
): Promise<{ responses: { data: Buffer; rinfo: dgram.RemoteInfo }[]; elapsed: number }> {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const client = dgram.createSocket("udp4");
    const responses: { data: Buffer; rinfo: dgram.RemoteInfo }[] = [];
    let isResolved = false;
    let inactivityTimer: NodeJS.Timeout | null = null;

    const cleanupAndResolve = (err?: Error) => {
      if (isResolved) return;
      isResolved = true;

      if (inactivityTimer) clearTimeout(inactivityTimer);
      clearTimeout(timer);
      client.close();

      const elapsed = Math.round(performance.now() - startTime);
      if (err && responses.length === 0) {
        reject(err);
      } else {
        resolve({ responses, elapsed });
      }
    };

    const resetInactivityTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      // Wait another 300ms for potential subsequent UDP packets
      inactivityTimer = setTimeout(() => {
        cleanupAndResolve();
      }, 300);
    };

    client.on("message", (msg, rinfo) => {
      responses.push({ data: msg, rinfo });
      resetInactivityTimer();
    });

    client.on("error", (err) => {
      cleanupAndResolve(err);
    });

    client.send(payloadBuffer, port, host, (err) => {
      if (err) {
        cleanupAndResolve(err);
      }
    });

    const timer = setTimeout(() => {
      cleanupAndResolve();
    }, timeoutMs);
  });
}

// Single Port scanner ping
function scanPort(host: string, port: number, timeoutMs = 800): Promise<{ port: number; status: "open" | "closed" }> {
  return new Promise((resolve) => {
    const client = new net.Socket();
    let isResolved = false;

    const resolveStatus = (status: "open" | "closed") => {
      if (isResolved) return;
      isResolved = true;
      client.destroy();
      clearTimeout(timer);
      resolve({ port, status });
    };

    client.connect(port, host, () => {
      resolveStatus("open");
    });

    client.on("error", () => {
      resolveStatus("closed");
    });

    const timer = setTimeout(() => {
      resolveStatus("closed");
    }, timeoutMs);
  });
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const { action, host, port, payload = "", payloadType = "text", timeout = 3000, ports = [] } = json as {
      action?: "tcp-send" | "udp-send" | "port-scan";
      host?: string;
      port?: number;
      payload?: string;
      payloadType?: "text" | "hex" | "base64";
      timeout?: number;
      ports?: number[];
    };

    if (!host) {
      return NextResponse.json({ error: "缺少目标主机地址 (host)" }, { status: 400 });
    }

    // Resolve target Host IP once to verify DNS availability
    let targetIp = host;
    try {
      const dnsResult = await dns.promises.lookup(host);
      targetIp = dnsResult.address;
    } catch (dnsErr) {
      return NextResponse.json({ 
        error: `域名解析失败，无法解析主机名 "${host}": ${(dnsErr as Error).message}` 
      }, { status: 400 });
    }

    if (action === "tcp-send") {
      if (!port || isNaN(port) || port < 1 || port > 65535) {
        return NextResponse.json({ error: "无效的端口号 (须在 1-65535 范围内)" }, { status: 400 });
      }
      const buf = parsePayload(payload, payloadType);
      const { data, elapsed } = await tcpSend(targetIp, port, buf, timeout);
      return NextResponse.json({
        success: true,
        elapsed,
        response: formatResponse(data)
      });
    }

    if (action === "udp-send") {
      if (!port || isNaN(port) || port < 1 || port > 65535) {
        return NextResponse.json({ error: "无效的端口号 (须在 1-65535 范围内)" }, { status: 400 });
      }
      const buf = parsePayload(payload, payloadType);
      const { responses, elapsed } = await udpSend(targetIp, port, buf, timeout);
      
      const formattedResponses = responses.map(r => ({
        rinfo: r.rinfo,
        response: formatResponse(r.data)
      }));

      return NextResponse.json({
        success: true,
        elapsed,
        responses: formattedResponses
      });
    }

    if (action === "port-scan") {
      if (!ports || !Array.isArray(ports) || ports.length === 0) {
        return NextResponse.json({ error: "缺少要扫描的端口列表" }, { status: 400 });
      }

      // Limit concurrent scans to max 50 ports to avoid resource exhaustion
      const targetPorts = ports
        .map(p => Number(p))
        .filter(p => !isNaN(p) && p >= 1 && p <= 65535)
        .slice(0, 50);

      if (targetPorts.length === 0) {
        return NextResponse.json({ error: "端口列表中没有有效的端口号" }, { status: 400 });
      }

      const scanPromises = targetPorts.map(p => scanPort(targetIp, p));
      const scanResults = await Promise.all(scanPromises);

      return NextResponse.json({
        success: true,
        results: scanResults
      });
    }

    return NextResponse.json({ error: "无效的操作指令" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "网络套接字操作失败" },
      { status: 500 }
    );
  }
}
