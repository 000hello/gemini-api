const TARGET = "https://generativelanguage.googleapis.com";

export default {
  async fetch(req: Request) {
    const url = new URL(req.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response("ok");
    }

    // Debug: test if fetch to external works
    if (url.pathname === "/debug") {
      try {
        const r = await fetch("https://httpbin.org/get");
        const t = await r.text();
        return new Response("httpbin: " + t.slice(0, 200));
      } catch (e) {
        return new Response("fetch failed: " + String(e), { status: 500 });
      }
    }

    const targetUrl = TARGET + url.pathname + url.search;

    try {
      const headers = new Headers();
      req.headers.forEach((v, k) => {
        if (k !== "host" && k !== "connection") headers.set(k, v);
      });

      const method = req.method;
      const body = (method === "GET" || method === "HEAD") ? undefined : await req.text();

      const res = await fetch(targetUrl, { method, headers, body });
      const data = await res.text();

      return new Response(data, {
        status: res.status,
        headers: {
          "content-type": res.headers.get("content-type") || "application/json",
          "access-control-allow-origin": "*",
        },
      });
    } catch (e) {
      return new Response("proxy error: " + String(e), { status: 502 });
    }
  },
};
