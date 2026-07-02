export default {
  fetch(req: Request): Response | Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response("ok");
    }

    const targetUrl = "https://generativelanguage.googleapis.com" + url.pathname + url.search;
    const headers = new Headers();
    for (const [k, v] of req.headers) {
      const lk = k.toLowerCase();
      if (lk !== "host" && lk !== "connection" && !lk.startsWith("cf-") && lk !== "x-forwarded-for") {
        headers.set(k, v);
      }
    }

    const init: RequestInit = { method: req.method, headers };
    if (req.method !== "GET" && req.method !== "HEAD") {
      return req.text()
        .then((body) => {
          if (body) init.body = body;
          return fetch(targetUrl, init);
        })
        .then((res) => res.text())
        .then((data) => new Response(data, {
          status: 200,
          headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
        }))
        .catch((e) => new Response("POST error: " + String(e), {
          status: 502,
        }));
    }

    return fetch(targetUrl, init)
      .then((res) => res.text())
      .then((data) => new Response(data, {
        status: 200,
        headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
      }))
      .catch((e) => new Response("GET error: " + String(e), {
        status: 502,
      }));
  },
};
