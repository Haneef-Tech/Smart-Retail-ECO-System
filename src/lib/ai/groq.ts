const GROQ_API_KEY = process.env.GROQ_API_KEY || ''
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function askGroq(
  messages: GroqMessage[],
  preferredModel = 'qwen/qwen3.8-27b'
): Promise<string | null> {
  if (!GROQ_API_KEY) {
    console.warn('[Groq API] GROQ_API_KEY not configured in environment')
    return null
  }

  const modelsToTry = [preferredModel, 'openai/gpt-oss-20b', 'openai/gpt-oss-120b']

  for (const model of modelsToTry) {
    try {
      const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.3,
          max_tokens: 800,
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        console.warn(`[Groq API Warning with ${model}]`, res.status, errText)
        continue // try next model
      }

      const data = await res.json()
      const content = data.choices?.[0]?.message?.content
      if (content && typeof content === 'string') {
        return content.trim()
      }
    } catch (error) {
      console.error(`[Groq API Error with ${model}]`, error)
    }
  }

  return null
}
