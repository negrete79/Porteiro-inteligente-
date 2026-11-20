// POST /api/generate-keys
// body: { dias, quantidade, obs, adminPwd }
// Gera chaves avulsas (dinheiro/transferência). Retorna lista de códigos. Firestore.
const { getFs, isAdmin } = require('../lib/firebase');

function randBlock(n) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { dias, quantidade, obs, adminPwd } = req.body || {};
  if (!isAdmin({ headers: req.headers, body: { adminPwd } })) {
    return res.status(401).json({ error: 'Senha admin incorreta' });
  }

  const d = Number(dias);
  const q = Math.min(100, Math.max(1, Number(quantidade) || 1));
  if (!d || d <= 0) return res.status(400).json({ error: 'dias inválido (30/60/90/365/36500)' });

  const fs = getFs();
  const now = Date.now();
  const lista = [];

  for (let i = 0; i < q; i++) {
    const codigo = 'PORTA-' + randBlock(4) + '-' + randBlock(4);
    const ref = await fs.collection('chaves').add({
      codigo, dias: d, usado: false, casaId: null,
      obs: obs || '', criadoEm: now
    });
    lista.push({ id: ref.id, codigo, dias: d });
  }

  return res.json({ ok: true, geradas: lista.length, chaves: lista });
};
