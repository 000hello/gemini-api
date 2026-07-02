export default {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // Health check
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response("ok", {
        headers: { "access-control-allow-origin": "*" },
      });
    }

    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, POST, OPTIONS",
          "access-control-allow-headers": "*",
        },
      });
    }

    try {
      const targetUrl = "https://generativelanguage.googleapis.com" + url.pathname + url.search;

      // Copy headers
      const headers = new Headers();
      for (const [k, v] of req.headers) {
        const lk = k.toLowerCase();
        if (lk !== "host" && lk !== "connection") headers.set(k, v);
      }

      // Forward
      const method = req.method;
      const body = (method === "GET" || method === "HEAD") ? null : await req.text();
      const init: RequestInit = { method, headers };
      if (body) init.body = body;

      const res = await fetch(targetUrl, init);
      const data = await res.text();

      return new Response(data, {
        status: res.status,
        headers: {
          "content-type": res.headers.get("content-type") || "application/json",
          "access-control-allow-origin": "*",
        },
      });
    } catch (e) {
      return new Response("proxy error: " + String(e), {
        status: 502,
        headers: { "content-type": "text/plain" },
      });
    }
  },
};
