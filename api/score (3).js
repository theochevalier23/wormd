const cache = {};

const MOTS_PAR_DATE = {
  '2026-05-19':'océan','2026-05-20':'forêt','2026-05-21':'musique',
  '2026-05-22':'montagne','2026-05-23':'voyage','2026-05-24':'rêve',
  '2026-05-25':'silence','2026-05-26':'flamme','2026-05-27':'miroir',
  '2026-05-28':'tonnerre','2026-05-29':'lumière','2026-05-30':'ombre',
  '2026-05-31':'rivière','2026-06-01':'nuage','2026-06-02':'château',
  '2026-06-03':'jardin','2026-06-04':'soleil','2026-06-05':'étoile',
  '2026-06-06':'tempête','2026-06-07':'plage','2026-06-08':'désert',
  '2026-06-09':'neige','2026-06-10':'ville','2026-06-11':'marché',
  '2026-06-12':'livre','2026-06-13':'guerre','2026-06-14':'fête',
  '2026-06-15':'printemps','2026-06-16':'automne','2026-06-17':'hiver'
};

function getMotDuJour() {
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return MOTS_PAR_DATE[date] || 'océan';
}

async function incrementFound(date) {
  try {
    const kv_url = process.env.KV_REST_API_URL;
    const kv_token = process.env.KV_REST_API_TOKEN;
    await fetch(`${kv_url}/incr/found:${date}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${kv_token}` }
    });
  } catch(e) {}
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { mot } = req.body;
  if (!mot) return res.status(400).json({ error: 'Paramètre manquant' });

  const motSecret = getMotDuJour();
  const motNettoye = mot.toLowerCase().trim();
  const cacheKey = `${motSecret}__${motNettoye}`;

  if (motNettoye === motSecret.toLowerCase().trim()) {
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    await incrementFound(date);
    return res.status(200).json({ score: 100.00, gagne: true });
  }

  if (cache[cacheKey] !== undefined) {
    return res.status(200).json({ score: cache[cacheKey], cached: true });
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
          content: `Tu es un validateur de mots pour un jeu de devinettes en français. Le joueur a proposé : "${mot}". Étape 1 — Vérifie si ce mot est valide : C'est un prénom ou nom propre → réponds exactement : INVALIDE. C'est mal orthographié → réponds exactement : INVALIDE. C'est un mot français valide → passe à l'étape 2. Étape 2 — Évalue la similarité sémantique avec "${motSecret}" sur une échelle de -20.00 à 100.00 : 100.00 = mot exact, 70-99.99 = très proche, 40-69.99 = lié, 20-39.99 = lien distant, 0-19.99 = peu lié, négatif = sans rapport. Sois précis avec les décimales. Réponds UNIQUEMENT avec "INVALIDE" ou un nombre décimal.`
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
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
