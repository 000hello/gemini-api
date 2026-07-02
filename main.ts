const TARGET = "https://generativelanguage.googleapis.com";

export default {
  fetch(req: Request) {
    const url = new URL(req.url);

    // health
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response("ok");
    }

    // Build target URL and forward
    const targetUrl = TARGET + url.pathname + url.search;

    const headers = new Headers();
    req.headers.forEach((v, k) => {
      if (k !== "host" && k !== "connection") headers.set(k, v);
    });

    return fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.body,
    });
  },
};
