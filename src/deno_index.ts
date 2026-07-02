/**
 * Gemini 透明代理 — 把所有请求原样转发到 Google Gemini API
 * 配合 CC Switch 本地代理使用：Anthropic → Gemini Native → 此代理 → Google
 */
const GOOGLE_API = "https://generativelanguage.googleapis.com";

// ===== WebSocket 转发（流式生成）=====
function handleWebSocket(req: Request): Response {
  const url = new URL(req.url);
  const targetUrl = `wss://generativelanguage.googleapis.com${url.pathname}${url.search}`;
  console.log("[WS] ->", targetUrl);

  const { socket: clientWs, response } = Deno.upgradeWebSocket(req);
  const targetWs = new WebSocket(targetUrl);
  const pending: string[] = [];

  targetWs.onopen = () => {
    console.log("[WS] connected to Gemini");
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
    console.log("[WS] client closed");
    if (targetWs.readyState === WebSocket.OPEN) targetWs.close(1000, e.reason);
  };

  targetWs.onclose = (e) => {
    console.log("[WS] gemini closed, code:", e.code);
    if (clientWs.readyState === WebSocket.OPEN) clientWs.close(e.code, e.reason);
  };

  targetWs.onerror = (e) => console.error("[WS] gemini error:", e);

  return response;
}

// ===== HTTP 转发 =====
async function handleHTTP(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const targetUrl = `${GOOGLE_API}${url.pathname}${url.search}`;
  console.log(`[HTTP] ${req.method} -> ${targetUrl}`);

  // 复制请求头，去掉 host（让 fetch 自己设）
  const headers = new Headers();
  req.headers.forEach((v, k) => {
    if (!["host", "cf-", "x-forwarded", "x-real"].some((p) =>
      k.toLowerCase().startsWith(p)
    )) {
      headers.set(k, v);
    }
  });

  // 对于 GET 请求，不传 body
  const body = req.method === "GET" || req.method === "HEAD"
    ? undefined
    : req.body;

  const proxyReq = new Request(targetUrl, {
    method: req.method,
    headers,
    body,
    redirect: "follow",
  });

  const res = await fetch(proxyReq);
  console.log(`[HTTP] <- ${res.status} ${res.statusText}`);

  // 构建响应头（加 CORS）
  const resHeaders = new Headers(res.headers);
  resHeaders.set("Access-Control-Allow-Origin", "*");

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: resHeaders,
  });
}

// ===== 主入口 =====
async function handleRequest(req: Request): Promise<Response> {
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

  // 其他全部 HTTP 转发
  return handleHTTP(req);
}

Deno.serve(handleRequest);
console.log("Gemini proxy running on http://localhost:8000");
