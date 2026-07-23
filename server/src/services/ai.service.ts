interface AIPredictionResult {
  category: string
  confidence: number
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const predictCategory = async (
  fileBuffer: Buffer,
  filename: string
): Promise<AIPredictionResult> => {
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000'
  const maxAttempts = 6
  const retryDelayMs = 10000

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const formData = new FormData()
      const blob = new Blob([new Uint8Array(fileBuffer)], { type: 'image/jpeg' })
      formData.append('file', blob, filename)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 70000)

      const startTime = Date.now()
      const response = await fetch(`${aiServiceUrl}/predict`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        const text = await response.text()
        console.error("AI STATUS:", response.status)
        console.error("AI BODY (truncated):", text.slice(0, 200))

        const isRetryableStatus = response.status === 502 || response.status === 503 || response.status === 504

        if (attempt < maxAttempts && isRetryableStatus) {
          console.warn(`AI Service attempt ${attempt} failed: HTTP ${response.status} (service likely still starting)`)
          console.log(`Retrying in ${retryDelayMs}ms...`)
          await sleep(retryDelayMs)
          continue
        }

        throw new Error(`AI Service HTTP error status ${response.status}`)
      }

      const duration = Date.now() - startTime
      console.log(`AI Service classification succeeded in ${duration}ms (attempt ${attempt})`)

      const data = (await response.json()) as {
        category: string
        confidence: number
        [key: string]: any
      }
      return {
        category: data.category || 'Other',
        confidence: data.confidence ?? 0.0,
      }
    } catch (err: any) {
      const message = err?.message || String(err)
      const isRetryableError =
        message.includes('terminated') ||
        message.includes('aborted') ||
        message.includes('ECONNRESET') ||
        message.includes('fetch failed')

      console.warn(`AI Service attempt ${attempt} failed: ${message}`)

      if (attempt < maxAttempts && isRetryableError) {
        console.log(`Retrying in ${retryDelayMs}ms...`)
        await sleep(retryDelayMs)
        continue
      }

      console.warn(`AI Service classification query failed after ${attempt} attempt(s): ${message}. Defaulting to 'Other'.`)
      return {
        category: 'Other',
        confidence: 0.0,
      }
    }
  }

  return {
    category: 'Other',
    confidence: 0.0,
  }
}
