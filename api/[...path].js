const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
const DEFAULT_CHAT_MODEL = process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b"
const OPENAI_API_URL = "https://api.openai.com/v1/responses"
const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-6-luna"

function fallbackAnswer(question = "") {
  const text = String(question || "").toLowerCase()

  const build = (direct, context, steps, docs, lawyer) =>
    [
      `Direct answer: ${direct}`,
      `Pakistani legal context: ${context}`,
      `What to do now: ${steps.join(" ")}`,
      `Documents or proof to keep: ${docs.join(" ")}`,
      `When to speak with a lawyer: ${lawyer}`,
    ].join("\n\n")

  if (["theft", "steal", "stolen", "robbery"].some((word) => text.includes(word))) {
    return build(
      "This sounds like a possible theft or property offence.",
      "The exact legal section depends on whether the facts point to theft, robbery, or another related offence.",
      [
        "Write down the full timeline.",
        "Preserve receipts, screenshots, CCTV, and witness names.",
        "Report the incident to the police as soon as possible.",
      ],
      [
        "Proof of ownership or possession.",
        "Messages, call logs, CCTV, and witness details.",
      ],
      "Use a licensed lawyer if the matter is urgent, repeated, or high value.",
    )
  }

  if (["divorce", "khula", "talaq", "custody", "maintenance"].some((word) => text.includes(word))) {
    return build(
      "This is a family-law issue that depends on the exact facts.",
      "Talaq, khula, custody, and maintenance can follow different procedures in Pakistan.",
      [
        "Keep marriage and identity documents ready.",
        "Save notices, messages, and financial records.",
        "Confirm the correct forum before filing anything.",
      ],
      [
        "Nikah nama, IDs, notices, and financial records.",
        "Any court papers or prior agreements.",
      ],
      "A family lawyer can tell you the right process and filing path.",
    )
  }

  if (["property", "land", "rent", "tenant", "lease"].some((word) => text.includes(word))) {
    return build(
      "This is likely a property or tenancy dispute.",
      "These matters usually turn on ownership records, possession history, and the written agreement.",
      [
        "Collect title papers, registry documents, and the agreement.",
        "Keep payment receipts and messages together.",
        "Avoid making oral promises when a dispute is already active.",
      ],
      ["Sale deed, registry, rent agreement, receipts, and correspondence."],
      "Speak with a lawyer if notice, possession, or litigation is involved.",
    )
  }

  return [
    "Direct answer: I cannot reach the AI service right now, so this is a structured legal fallback.",
    "Pakistani legal context: I will keep the reply general unless you share the exact facts.",
    "What to do now: Share the issue, the date, the place, the parties involved, and any deadlines.",
    "Documents or proof to keep: Messages, notices, receipts, IDs, and any court papers.",
    "When to speak with a lawyer: Always do so for urgent, sensitive, or high-stakes matters.",
  ].join("\n\n")
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)))
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8")
      if (!raw) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch {
        resolve({})
      }
    })
    req.on("error", reject)
  })
}

function compactHistory(history) {
  if (!Array.isArray(history)) return []
  return history
    .filter((msg) => msg && (msg.role === "user" || msg.role === "assistant") && typeof msg.content === "string")
    .slice(-8)
    .map((msg) => ({
      role: msg.role,
      content: msg.content.slice(0, 4000),
    }))
}

async function requestOpenAI(question, history) {
  if (!process.env.OPENAI_API_KEY) return ""
  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        {
          role: "developer",
          content: "You are CaseMind AI, a Pakistani legal assistant. Answer in the user's language with detailed, mobile-friendly sections: Direct answer, Pakistani legal context, What to do now, Documents or proof to keep, and When to speak with a lawyer. Do not invent statutes or citations; state uncertainty clearly and recommend a licensed lawyer for formal advice.",
        },
        ...compactHistory(history),
        { role: "user", content: question },
      ],
      max_output_tokens: 1200,
    }),
  })
  const data = await response.json()
  return response.ok && typeof data?.output_text === "string" ? data.output_text.trim() : ""
}

async function handleAsk(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, message: "Method not allowed." })
    return
  }

  const body = await readBody(req)
  const question = typeof body.question === "string" ? body.question.trim() : ""
  if (!question) {
    res.status(400).json({ success: false, message: "Question is required." })
    return
  }

  try {
    const upstream = process.env.GROQ_API_KEY ? await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_CHAT_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are CaseMind AI, a polished Pakistani legal assistant. Answer in the same language the user uses. Give detailed but mobile-friendly responses with the sections: Direct answer, Pakistani legal context, What to do now, Documents or proof to keep, and When to speak with a lawyer. Do not invent statutes or citations. If information is uncertain, say so plainly.",
          },
          ...compactHistory(body.history),
          { role: "user", content: question },
        ],
        temperature: 0.25,
        max_tokens: 1200,
      }),
    }) : null

    if (upstream) {
      const data = await upstream.json()
      const answer = data?.choices?.[0]?.message?.content?.trim()
      if (upstream.ok && answer) {
        res.status(200).json({ success: true, answer, mode: "groq" })
        return
      }
    }

    const openAiAnswer = await requestOpenAI(question, body.history)
    if (openAiAnswer) {
      res.status(200).json({ success: true, answer: openAiAnswer, mode: "openai" })
      return
    }

    res.status(503).json({ success: false, answer: fallbackAnswer(question), mode: "fallback", message: "No configured AI provider returned a response." })
  } catch (error) {
    try {
      const openAiAnswer = await requestOpenAI(question, body.history)
      if (openAiAnswer) {
        res.status(200).json({ success: true, answer: openAiAnswer, mode: "openai" })
        return
      }
    } catch {
      // Keep provider details server-side and return the structured fallback below.
    }
    res.status(503).json({ success: false, answer: fallbackAnswer(question), mode: "fallback", message: "The configured AI providers are unavailable." })
  }
}

export default async function handler(req, res) {
  const configuredBackend = (process.env.BACKEND_URL || process.env.VITE_API_BASE_URL || "").trim()
  const backendBase = configuredBackend && /^https?:\/\//i.test(configuredBackend)
    ? configuredBackend
    : configuredBackend
      ? `https://${configuredBackend}`
      : ""
  const incomingUrl = new URL(req.url, "http://localhost")
  const targetPath = incomingUrl.pathname.replace(/^\/api/, "") || "/"

  if (targetPath === "/ask") {
    await handleAsk(req, res)
    return
  }

  if (!backendBase) {
    res.status(500).json({
      success: false,
      message: "Account service is not configured. Set BACKEND_URL in Vercel to the deployed backend URL, then redeploy.",
    })
    return
  }

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
      const body = await readBody(req)
      init.body = JSON.stringify(body)
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
