// POST /api/update-casa
// body: { casaId, nome, adminPwd }
// Admin edita o nome da casa (ex: "Nova casa - aguardando nome" → "Apto 101 - João"). Firestore.
const { getFs, isAdmin } = require('../lib/firebase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { casaId, nome, adminPwd } = req.body || {};
  if (!isAdmin({ headers: req.headers, body: { adminPwd } })) {
    return res.status(401).json({ error: 'Senha admin incorreta' });
  }
  if (!casaId) return res.status(400).json({ error: 'casaId obrigatório' });
  if (!nome || !String(nome).trim()) return res.status(400).json({ error: 'nome obrigatório' });

  const fs = getFs();
  const ref = fs.collection('casas').doc(casaId);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: 'Casa não encontrada' });

  await ref.update({ nome: String(nome).trim() });
  return res.json({ ok: true, casaId, nome: String(nome).trim() });
};
