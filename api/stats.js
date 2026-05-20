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

function getDate(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const today = getDate(0);
  const yesterday = getDate(-1);
  const motHier = MOTS_PAR_DATE[yesterday] || '—';

  try {
    const kv_url = process.env.KV_REST_API_URL;
    const kv_token = process.env.KV_REST_API_TOKEN;
    const key = `found:${today}`;

    const r = await fetch(`${kv_url}/get/${key}`, {
      headers: { Authorization: `Bearer ${kv_token}` }
    });
    const data = await r.json();
    const count = parseInt(data.result || '0', 10);

    return res.status(200).json({ motHier, count });
  } catch (e) {
    return res.status(200).json({ motHier, count: 0 });
  }
}
