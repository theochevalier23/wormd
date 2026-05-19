const cache = {};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { mot, motSecret } = req.body;
  if (!mot || !motSecret) return res.status(400).json({ error: 'Paramètres manquants' });

  const motNettoye = mot.toLowerCase().trim();
  const cacheKey = `${motSecret}__${motNettoye}`;

  if (cache[cacheKey] !== undefined) {
    return res.status(200).json({ score: cache[cacheKey], cached: true });
  }

  if (motNettoye === motSecret.toLowerCase().trim()) {
    cache[cacheKey] = 100.00;
    return res.status(200).json({ score: 100.00 });
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
        max_tokens: 20,
        messages: [{
          role: 'user',
          content: `Tu es un validateur de mots pour un jeu de devinettes en français.

Le joueur a proposé : "${mot}"

Étape 1 — Vérifie si ce mot est valide :
- C'est un prénom ou nom propre (ex: théo, aristide, paris, nike) → réponds exactement : INVALIDE
- C'est mal orthographié et n'existe pas en français (ex: "voitur", "maiosn") → réponds exactement : INVALIDE  
- C'est un mot français courant valide → passe à l'étape 2

Étape 2 — Si le mot est valide, évalue sa similarité sémantique avec "${motSecret}" sur une échelle de -20.00 à 100.00 :
- 100.00 : mot exact ou synonyme parfait
- 70.00-99.99 : très proche
- 40.00-69.99 : lié
- 20.00-39.99 : lien distant
- 0.00-19.99 : peu lié
- -0.01 à -20.00 : sans rapport

Réponds UNIQUEMENT avec soit "INVALIDE" soit un nombre décimal (ex: 67.34). Rien d'autre.`
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text?.trim() || '0';

    if (text === 'INVALIDE') {
      return res.status(200).json({ score: null, invalide: true });
    }

    const score = parseFloat(text.replace(/[^-\d.]/g, ''));
    const finalScore = isNaN(score) ? 0 : Math.max(-20, Math.min(100, Math.round(score * 100) / 100));

    cache[cacheKey] = finalScore;
    return res.status(200).json({ score: finalScore });

  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
}
