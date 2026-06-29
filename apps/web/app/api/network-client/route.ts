import { NextRequest, NextResponse } from "next/server";
import net from "node:net";
import dgram from "node:dgram";

// Helpers to convert payload formats
function parsePayload(payload: string, type: string): Buffer {
  if (type === "hex") {
    const cleanHex = payload.replace(/\s+|0x/g, "");
    if (cleanHex.length % 2 !== 0) {
      throw new Error("Hex string must have an even length");
    }
    return Buffer.from(cleanHex, "hex");
  }
  if (type === "base64") {
    return Buffer.from(payload.trim(), "base64");
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

// TCP Send-and-Receive handler
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

    const cleanupAndResolve = (err?: Error) => {
      if (isResolved) return;
      isResolved = true;
      client.destroy();
      clearTimeout(timer);
      const elapsed = Math.round(performance.now() - startTime);
      if (err) {
        reject(err);
      } else {
        resolve({ data: Buffer.concat(dataChunks), elapsed });
      }
    };

    client.connect(port, host, () => {
      client.write(payloadBuffer);
    });

    client.on("data", (chunk) => {
      dataChunks.push(chunk);
      // For standard protocols, we can wait until connection closes or timeout.
      // If we got some data and it's a request-response, we can optionally wait a tiny bit more
      // or resolve right away if we expect a single response. To be safe, we collect all data
      // until connection is closed by the server, OR until timeout occurs.
    });

    client.on("end", () => {
      cleanupAndResolve();
    });

    client.on("error", (err) => {
      cleanupAndResolve(err);
    });

    const timer = setTimeout(() => {
      // If we got some data, resolve with it. Otherwise timeout error
      if (dataChunks.length > 0) {
        cleanupAndResolve();
      } else {
        cleanupAndResolve(new Error(`TCP connection timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);
  });
}

// UDP Send-and-Receive handler
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

    const cleanupAndResolve = (err?: Error) => {
      if (isResolved) return;
      isResolved = true;
      client.close();
      clearTimeout(timer);
      const elapsed = Math.round(performance.now() - startTime);
      if (err && responses.length === 0) {
        reject(err);
      } else {
        resolve({ responses, elapsed });
      }
    };

    client.on("message", (msg, rinfo) => {
      responses.push({ data: msg, rinfo });
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
      return NextResponse.json({ error: "Missing target host" }, { status: 400 });
    }

    if (action === "tcp-send") {
      if (!port) return NextResponse.json({ error: "Missing port for TCP" }, { status: 400 });
      const buf = parsePayload(payload, payloadType);
      const { data, elapsed } = await tcpSend(host, port, buf, timeout);
      return NextResponse.json({
        success: true,
        elapsed,
        response: formatResponse(data)
      });
    }

    if (action === "udp-send") {
      if (!port) return NextResponse.json({ error: "Missing port for UDP" }, { status: 400 });
      const buf = parsePayload(payload, payloadType);
      const { responses, elapsed } = await udpSend(host, port, buf, timeout);
      
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
      if (!ports || ports.length === 0) {
        return NextResponse.json({ error: "Missing ports to scan" }, { status: 400 });
      }

      // Limit concurrent scans to max 50 ports for safety
      const targetPorts = ports.slice(0, 50);
      const scanPromises = targetPorts.map(p => scanPort(host, p));
      const scanResults = await Promise.all(scanPromises);

      return NextResponse.json({
        success: true,
        results: scanResults
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Network request failed" },
      { status: 500 }
    );
  }
}
