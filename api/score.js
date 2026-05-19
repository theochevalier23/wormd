export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mot, motSecret } = req.body;

  if (!mot || !motSecret) {
    return res.status(400).json({ error: 'Paramètres manquants' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: `Tu es un moteur de similarité sémantique pour un jeu de devinettes en français. Le mot secret est "${motSecret}". Le joueur a proposé : "${mot}". Évalue la similarité sémantique entre "${mot}" et "${motSecret}" sur une échelle de -20 à 100 : 100 = mot exact ou synonyme parfait, 70-99 = très proche, 40-69 = lié, 20-39 = lien distant, 0-19 = peu lié, -1 à -20 = sans rapport. Sois cohérent et précis. Réponds UNIQUEMENT avec un nombre entier, rien d'autre.`
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text?.trim() || '0';
    const score = parseInt(text.replace(/[^-\d]/g, ''), 10);
    const finalScore = isNaN(score) ? 0 : Math.max(-20, Math.min(100, score));

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ score: finalScore });

  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
}
