export default async function handler(req, res) {
  const backendBase = (process.env.BACKEND_URL || process.env.VITE_API_BASE_URL || "").trim()

  if (!backendBase) {
    res.status(500).json({
      success: false,
      message: "BACKEND_URL is not configured on Vercel.",
    })
    return
  }

  const incomingUrl = new URL(req.url, "http://localhost")
  const targetPath = incomingUrl.pathname.replace(/^\/api/, "") || "/"
  const targetUrl = `${backendBase.replace(/\/$/, "")}${targetPath}${incomingUrl.search}`

  try {
    const headers = new Headers()
    for (const [key, value] of Object.entries(req.headers)) {
      if (!value) continue
      if (["host", "connection", "content-length"].includes(key.toLowerCase())) continue
      headers.set(key, Array.isArray(value) ? value.join(",") : value)
    }

    const init = {
      method: req.method,
      headers,
    }

    if (!["GET", "HEAD"].includes(req.method || "GET")) {
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      init.body = Buffer.concat(chunks)
    }

    const upstream = await fetch(targetUrl, init)
    const body = Buffer.from(await upstream.arrayBuffer())

    res.status(upstream.status)
    upstream.headers.forEach((value, key) => {
      if (["content-length", "transfer-encoding", "connection"].includes(key.toLowerCase())) return
      res.setHeader(key, value)
    })
    res.send(body)
  } catch (error) {
    res.status(502).json({
      success: false,
      message: `Proxy request failed: ${error.message}`,
    })
  }
}
