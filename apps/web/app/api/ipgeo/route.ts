import { NextRequest, NextResponse } from "next/server";

interface IpGeoResponse {
  status: "success" | "fail";
  message?: string;
  country?: string;
  countryCode?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
  query?: string;
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json().catch(() => ({}));
    let { ip } = json as { ip?: string };

    // If ip is not supplied, detect client IP from headers safely
    if (!ip) {
      const forwarded = request.headers.get("x-forwarded-for");
      if (forwarded) {
        ip = forwarded.split(",")[0].trim();
      } else {
        ip = request.headers.get("x-real-ip") || "127.0.0.1";
      }
    }

    const cleanIp = (ip || "127.0.0.1").trim();
    if (
      cleanIp === "127.0.0.1" || 
      cleanIp === "::1" || 
      cleanIp.startsWith("192.168.") || 
      cleanIp.startsWith("10.") || 
      cleanIp.startsWith("172.16.") || 
      cleanIp.startsWith("fe80:")
    ) {
      return NextResponse.json({
        ip: cleanIp,
        country: "本地局域网",
        countryCode: "LAN",
        region: "私有网络",
        city: "本地回环",
        zip: "-",
        lat: 0,
        lon: 0,
        timezone: "Asia/Shanghai",
        isp: "Local Loopback / Intranet",
        org: "Private Address Space",
        as: "N/A"
      });
    }

    // Call server-side public geo IP API to fetch data (bypasses browser adblockers)
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(cleanIp)}?lang=zh-CN`, {
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) {
      throw new Error(`IP Geo API returned status: ${res.status}`);
    }

    const data = await res.json() as IpGeoResponse;

    if (data.status === "fail") {
      return NextResponse.json({ error: data.message || "IP 地址查询失败" }, { status: 400 });
    }

    return NextResponse.json({
      ip: data.query || cleanIp,
      country: data.country || "未知",
      countryCode: data.countryCode || "未知",
      region: data.regionName || "未知",
      city: data.city || "未知",
      zip: data.zip || "-",
      lat: data.lat || 0,
      lon: data.lon || 0,
      timezone: data.timezone || "未知",
      isp: data.isp || "未知",
      org: data.org || "未知",
      as: data.as || "未知"
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "IP 地理位置查询超时或网络失败" },
      { status: 500 }
    );
  }
}
