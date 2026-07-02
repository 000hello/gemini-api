export default {
  fetch(req: Request): Response | Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response("ok");
    }

    const targetUrl = "https://generativelanguage.googleapis.com" + url.pathname + url.search;

    // Simple GET proxy first — no body forwarding yet
    if (req.method === "GET" || req.method === "HEAD") {
      return fetch(targetUrl, {
        method: req.method,
        headers: new Headers(
          Array.from(req.headers).filter(
            ([k]) => !["host", "connection"].includes(k.toLowerCase())
          )
        ),
      });
    }

    // POST with body
    return req.text().then((body) =>
      fetch(targetUrl, {
        method: req.method,
        headers: new Headers(
          Array.from(req.headers).filter(
            ([k]) => !["host", "connection"].includes(k.toLowerCase())
          )
        ),
        body,
      })
    );
  },
};
