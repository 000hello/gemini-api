/**
 * Gemini 透明代理 — 转发所有请求到 Google Gemini API
 * 配合 CC Switch 使用：Anthropic → Gemini Native → 此代理 → Google
 */
const GOOGLE_API = "https://generativelanguage.googleapis.com";

// ===== WebSocket =====
function handleWebSocket(req: Request): Response {
  const url = new URL(req.url);
  const targetUrl = `wss://generativelanguage.googleapis.com${url.pathname}${url.search}`;

  const { socket: clientWs, response } = Deno.upgradeWebSocket(req);
  const targetWs = new WebSocket(targetUrl);
  const pending: string[] = [];

  targetWs.onopen = () => {
    pending.forEach((m) => targetWs.send(m));
    pending.length = 0;
  };
  clientWs.onmessage = (e) => {
    targetWs.readyState === WebSocket.OPEN
      ? targetWs.send(e.data)
      : pending.push(e.data);
  };
  targetWs.onmessage = (e) => {
    if (clientWs.readyState === WebSocket.OPEN) clientWs.send(e.data);
  };
  clientWs.onclose = (e) => {
    if (targetWs.readyState === WebSocket.OPEN) targetWs.close(1000, e.reason);
  };
  targetWs.onclose = (e) => {
    if (clientWs.readyState === WebSocket.OPEN) clientWs.close(e.code, e.reason);
  };
  targetWs.onerror = (e) => console.error("[WS] error:", e);
  return response;
}

// ===== HTTP =====
async function handleHTTP(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const targetUrl = `${GOOGLE_API}${url.pathname}${url.search}`;

  const headers = new Headers();
  req.headers.forEach((v, k) => {
    const lk = k.toLowerCase();
    if (!["host", "connection", "cf-", "x-forwarded", "x-real"].some(
      (p) => lk.startsWith(p)
    )) {
      headers.set(k, v);
    }
  });

  const method = req.method.toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : req.body;

  try {
    const proxyReq = new Request(targetUrl, { method, headers, body });
    const res = await fetch(proxyReq);

    const resHeaders = new Headers(res.headers);
    resHeaders.set("Access-Control-Allow-Origin", "*");
    resHeaders.set("Access-Control-Expose-Headers", "*");

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: resHeaders,
    });
  } catch (err) {
    console.error("[HTTP] fetch error:", err);
    return new Response(
      JSON.stringify({ error: "proxy fetch failed", detail: String(err) }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}

// ===== 主入口 =====
Deno.serve((req: Request) => {
  // 健康检查
  const pathname = new URL(req.url).pathname;
  if (pathname === "/" || pathname === "/health") {
    return new Response("ok", {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  // CORS 预检
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  // WebSocket
  if (req.headers.get("Upgrade")?.toLowerCase() === "websocket") {
    return handleWebSocket(req);
  }

  return handleHTTP(req);
});
