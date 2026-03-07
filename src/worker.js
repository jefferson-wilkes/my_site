export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/api/cat-response' && request.method === 'POST') {
      const { score, caught, missed, pounces, avgLaserY, avgSpeed } = await request.json()

      const laserHeight = avgLaserY > 320
        ? 'too low — near the bottom of the screen, which means the cat barely has room to move and items are already past the sweet spot by the time the cat reaches them'
        : avgLaserY < 160
        ? 'too high — near the top of the screen, far from where items land, so the cat has to travel a long distance to reach falling items and misses many of them'
        : 'mid-screen, which is the optimal zone — close enough to intercept items without being too low to react'

      const movement = avgSpeed > 250
        ? 'fast and erratic — moving the laser quickly and unpredictably'
        : avgSpeed < 100
        ? 'very slow and minimal — barely moving the laser at all'
        : 'moderate and controlled'

      const prompt = `A player just finished a 60-second game of Laser Chase. Here is exactly how the game works:

- Items (fish, yarn, etc.) fall from the top of the screen toward the bottom
- The player moves a laser dot to guide a cat to intercept the falling items
- The cat chases the laser — wherever the laser is, the cat tries to reach it
- The optimal laser position is mid-screen (vertically): low enough that the cat is close to falling items, but high enough to have time to react to new spawns
- Keeping the laser too high means the cat is far from items and misses them as they fall past
- Keeping the laser too low means items have already fallen out of reach before the cat arrives
- The cat also has an AI that watches, stalks, and pounces — it is always moving toward the laser

Player stats this game:
- Final score: ${score}
- Items caught: ${caught}, items missed: ${missed}
- The cat pounced ${pounces} times toward the laser
- Average laser height: ${laserHeight}
- Laser movement style: ${movement}

Give 2-3 sentences of encouraging, specific coaching advice on how they can improve. Be positive and use cat puns naturally — don't force every word, just weave a few in. Focus on what they should do more of, not just what went wrong.`

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
