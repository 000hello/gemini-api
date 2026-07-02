export default {
  fetch(req: Request) {
    const url = new URL(req.url);

    if (url.pathname === "/") {
      return new Response("ok");
    }

    return fetch("https://generativelanguage.googleapis.com" + url.pathname + url.search)
      .catch(function() {
        return new Response("fetch failed");
      });
  },
};
