export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/api/cat-response' && request.method === 'POST') {
      const { score, caught, missed, pounces, avgLaserY, avgSpeed } = await request.json()

      const laserHeight = avgLaserY > 320
        ? 'low on screen — they were waiting for items to fall close before reacting'
        : avgLaserY < 160
        ? 'high on screen — they were anticipating items and moving early'
        : 'mid-screen'

      const movement = avgSpeed > 250
        ? 'fast and erratic'
        : avgSpeed < 100
        ? 'slow and minimal — they barely moved'
        : 'moderate and controlled'

      const prompt = `A player just finished a 60-second game of Laser Chase. In the game, they move a laser dot to guide a cat toward falling items to collect points.

Stats:
- Final score: ${score}
- Items caught: ${caught}, items missed: ${missed}
- The cat pounced ${pounces} times
- Average laser position: ${laserHeight}
- Movement style: ${movement}

Give 2-3 sentences of direct, practical coaching advice on how they can improve their score next game. Be specific and actionable.`

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 120,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      const data = await response.json()
      const text = data.content?.[0]?.text ?? 'No advice available.'

      return new Response(JSON.stringify({ text }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return env.ASSETS.fetch(request)
  },
}
