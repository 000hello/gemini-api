const TARGET = "https://generativelanguage.googleapis.com";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // Health check
  if (url.pathname === "/" || url.pathname === "/health") {
    return new Response("ok");
  }

  try {
    const targetUrl = TARGET + url.pathname + url.search;
    const method = req.method;

    // Copy headers (skip host/connection)
    const headers = new Headers();
    for (const [k, v] of req.headers) {
      const lk = k.toLowerCase();
      if (lk !== "host" && lk !== "connection") headers.set(k, v);
    }

    // Build forwarded request
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
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
});
