import { NextRequest, NextResponse } from "next/server";
import dns from "node:dns";

interface DnsRecord {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

const typeMap: Record<string, number> = {
  A: 1,
  NS: 2,
  CNAME: 5,
  SOA: 6,
  MX: 15,
  TXT: 16,
  AAAA: 28,
  CAA: 257
};

async function resolveLocalDns(domain: string, type: string): Promise<DnsRecord[]> {
  const promises = dns.promises;
  const numericType = typeMap[type] || 1;

  try {
    switch (type) {
      case "A": {
        const addresses = await promises.resolve4(domain);
        return addresses.map(addr => ({ name: domain, type: numericType, TTL: 60, data: addr }));
      }
      case "AAAA": {
        const addresses = await promises.resolve6(domain);
        return addresses.map(addr => ({ name: domain, type: numericType, TTL: 60, data: addr }));
      }
      case "CNAME": {
        const targets = await promises.resolveCname(domain);
        return targets.map(target => ({ name: domain, type: numericType, TTL: 60, data: target }));
      }
      case "MX": {
        const records = await promises.resolveMx(domain);
        return records.map(rec => ({
          name: domain,
          type: numericType,
          TTL: 60,
          data: `${rec.exchange} (优先级: ${rec.priority})`
        }));
      }
      case "TXT": {
        const records = await promises.resolveTxt(domain);
        return records.map(rec => ({
          name: domain,
          type: numericType,
          TTL: 60,
          data: rec.join(" ")
        }));
      }
      case "NS": {
        const records = await promises.resolveNs(domain);
        return records.map(ns => ({ name: domain, type: numericType, TTL: 60, data: ns }));
      }
      case "SOA": {
        const record = await promises.resolveSoa(domain);
        const dataStr = `主DNS: ${record.nsname}, 负责人: ${record.hostmaster}, 序列号: ${record.serial}, 刷新: ${record.refresh}, 重试: ${record.retry}, 过期: ${record.expire}, 最小TTL: ${record.minttl}`;
        return [{ name: domain, type: numericType, TTL: 60, data: dataStr }];
      }
      case "CAA": {
        if (typeof promises.resolveCaa === "function") {
          const records = await promises.resolveCaa(domain);
          return records.map(rec => {
            let val = "";
            if (rec.issue) val = `issue "${rec.issue}"`;
            else if (rec.issuewild) val = `issuewild "${rec.issuewild}"`;
            else if (rec.iodef) val = `iodef "${rec.iodef}"`;
            return {
              name: domain,
              type: numericType,
              TTL: 60,
              data: `${rec.critical} ${val}`
            };
          });
        }
        return [];
      }
      default:
        throw new Error(`不支持的本地 DNS 解析记录类型: ${type}`);
    }
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "ENODATA" || code === "ENOTFOUND" || code === "ESERVFAIL") {
      return [];
    }
    throw err;
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const { domain, recordType } = json as { domain?: string; recordType?: string };

    if (!domain || !recordType) {
      return NextResponse.json({ error: "Missing domain or recordType parameter" }, { status: 400 });
    }

    const cleanDomain = domain.trim();
    const cleanType = recordType.trim().toUpperCase();

    let answers: DnsRecord[] = [];
    if (cleanType === "ALL") {
      const typesToQuery = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA"];
      const results = await Promise.allSettled(
        typesToQuery.map(t => resolveLocalDns(cleanDomain, t))
      );
      
      results.forEach(res => {
        if (res.status === "fulfilled") {
          answers = [...answers, ...res.value];
        }
      });
    } else {
      answers = await resolveLocalDns(cleanDomain, cleanType);
    }

    return NextResponse.json({
      success: true,
      domain: cleanDomain,
      type: cleanType,
      answers,
      authority: []
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "系统本地 DNS 解析故障" },
      { status: 500 }
    );
  }
}
