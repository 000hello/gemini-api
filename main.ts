export default {
  fetch(req: Request) {
    const url = new URL(req.url);

    if (url.pathname === "/") {
      return new Response("ok");
    }

    const targetUrl = "https://generativelanguage.googleapis.com" + url.pathname + url.search;

    // Copy allowed headers
    const headers = new Headers();
    req.headers.forEach(function(v, k) {
      var lk = k.toLowerCase();
      if (lk !== "host" && lk !== "connection") headers.set(k, v);
    });

    // Forward with body for POST/PUT, without for GET/HEAD
    var method = req.method;
    if (method === "GET" || method === "HEAD") {
      return fetch(targetUrl, { method: method, headers: headers });
    }

    return req.text().then(function(body) {
      return fetch(targetUrl, { method: method, headers: headers, body: body });
    });
  },
};
