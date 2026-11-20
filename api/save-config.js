// POST /api/save-config
// body: { mensalidade, trialDias, mpToken?, adminPwd }
// Salva config no Firestore (config/main). Se mpToken vier, valida na hora (testa API MP).
const { getFs, isAdmin } = require('../lib/firebase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { mensalidade, trialDias, mpToken, adminPwd } = req.body || {};
  if (!isAdmin({ headers: req.headers, body: { adminPwd } })) {
    return res.status(401).json({ error: 'Senha admin incorreta' });
  }

  const fs = getFs();
  const ref = fs.collection('config').doc('main');
  const updates = {};
  if (mensalidade != null) updates.mensalidade = Number(mensalidade);
  if (trialDias != null) updates.trialDias = Number(trialDias);

  let tokenValid = null, producao = false;
  if (mpToken && mpToken.trim()) {
    try {
      const r = await fetch('https://api.mercadopago.com/users/me', {
        headers: { Authorization: `Bearer ${mpToken.trim()}` }
      });
      if (r.ok) {
        const j = await r.json();
        tokenValid = true;
        producao = !j.site_id || !j.site_id.startsWith('MLB');
        updates.mpToken = Buffer.from(mpToken.trim(), 'utf8').toString('base64');
        updates.mpTokenInfo = { user_id: j.id, country: j.site_id, validatedAt: Date.now() };
      } else { tokenValid = false; }
    } catch (e) { tokenValid = false; }
  }

  if (Object.keys(updates).length) await ref.set(updates, { merge: true });

  return res.status(200).json({
    ok: true,
    tokenValid,
    producao: tokenValid === true,
    mensalidade: mensalidade != null ? Number(mensalidade) : undefined,
    trialDias: trialDias != null ? Number(trialDias) : undefined
  });
};
