import { NextRequest, NextResponse } from "next/server";
import tls from "node:tls";
import dns from "node:dns";

function fetchSslCertificate(host: string, port = 443, timeout = 5000): Promise<tls.PeerCertificate> {
  return new Promise((resolve, reject) => {
    let isResolved = false;

    const socket = tls.connect(
      {
        host,
        port,
        servername: host, // Critical for SNI
        rejectUnauthorized: false // Don't reject invalid certs so we can parse expired/self-signed ones!
      },
      () => {
        const cert = socket.getPeerCertificate(true); // true to get the full certificate chain
        if (cert && Object.keys(cert).length > 0) {
          resolve(cert);
          isResolved = true;
          socket.destroy();
        } else {
          reject(new Error("未能获取该站点的 SSL 证书。"));
          isResolved = true;
          socket.destroy();
        }
      }
    );

    socket.on("error", (err) => {
      if (isResolved) return;
      isResolved = true;
      reject(err);
      socket.destroy();
    });

    setTimeout(() => {
      if (isResolved) return;
      isResolved = true;
      reject(new Error("SSL 连接握手超时"));
      socket.destroy();
    }, timeout);
  });
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const { host, port = 443, timeout = 5000 } = json as {
      host?: string;
      port?: number;
      timeout?: number;
    };

    if (!host) {
      return NextResponse.json({ error: "Missing host parameter" }, { status: 400 });
    }

    // Resolve DNS first to check domain availability
    try {
      await dns.promises.lookup(host);
    } catch (dnsErr) {
      return NextResponse.json(
        { error: `域名解析失败，无法解析主机名 "${host}": ${(dnsErr as Error).message}` },
        { status: 400 }
      );
    }

    const certInfo = await fetchSslCertificate(host, port, timeout);

    return NextResponse.json({
      success: true,
      cert: certInfo
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取 SSL 证书失败" },
      { status: 500 }
    );
  }
}
