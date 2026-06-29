import { NextRequest, NextResponse } from "next/server";

interface RedirectStep {
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  location: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const { url, method = "GET", headers = {}, body = "" } = json as {
      url?: string;
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    };

    if (!url) {
      return NextResponse.json({ error: "Missing target URL" }, { status: 400 });
    }

    let currentUrl = url;
    const redirectChain: RedirectStep[] = [];
    let finalResponse: Response | null = null;
    let depth = 0;
    const maxRedirects = 15;

    // Follow redirect chain on the server side
    while (depth < maxRedirects) {
      const headersMap = new Headers();
      // Forward request headers
      Object.entries(headers).forEach(([k, v]) => {
        headersMap.set(k, v);
      });

      // Avoid caching
      headersMap.set("Cache-Control", "no-cache");
      headersMap.set("Pragma", "no-cache");

      // Ensure User-Agent is set
      if (!headersMap.has("user-agent")) {
        headersMap.set(
          "User-Agent",
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 tool-platform-agent/1.0"
        );
      }

      const fetchOptions: RequestInit = {
        method: depth === 0 ? method : "GET", // Redirects (301/302) usually change POST/PUT to GET
        headers: headersMap,
        redirect: "manual",
      };

      // Only include body for the first step if it's not GET/HEAD
      if (depth === 0 && method !== "GET" && method !== "HEAD" && body) {
        fetchOptions.body = typeof body === "object" ? JSON.stringify(body) : body;
      }

      const response = await fetch(currentUrl, fetchOptions);
      finalResponse = response;

      const headersObj: Record<string, string> = {};
      response.headers.forEach((v, k) => {
        headersObj[k] = v;
      });

      const location = response.headers.get("location");

      redirectChain.push({
        url: currentUrl,
        status: response.status,
        statusText: response.statusText,
        headers: headersObj,
        location,
      });

      // Follow redirects for 3xx status codes
      if (response.status >= 300 && response.status < 400 && location) {
        try {
          currentUrl = new URL(location, currentUrl).href;
          depth++;
        } catch {
          break; // Invalid redirect URL
        }
      } else {
        break; // No more redirects
      }
    }

    if (!finalResponse) {
      return NextResponse.json({ error: "Failed to fetch resource" }, { status: 502 });
    }

    // Extract final response details
    const resHeaders: Record<string, string> = {};
    finalResponse.headers.forEach((v, k) => {
      resHeaders[k] = v;
    });

    const responseText = await finalResponse.text();

    return NextResponse.json({
      status: finalResponse.status,
      statusText: finalResponse.statusText,
      headers: resHeaders,
      body: responseText,
      redirectChain,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
