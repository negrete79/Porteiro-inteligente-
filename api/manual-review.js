// POST /api/manual-review
// body: { casaId, comprovante }
// Botão "NÃO ATIVOU": salva comprovante/ID pra verificação manual. Firestore.
const { getFs } = require('../lib/firebase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { casaId, comprovante } = req.body || {};
  if (!casaId || !comprovante) return res.status(400).json({ error: 'casaId e comprovante obrigatório' });

  const fs = getFs();
  const ref = await fs.collection('manuais').add({
    casaId, comprovante: String(comprovante).trim(),
    data: Date.now(), status: 'pendente'
  });

  return res.json({ ok: true, id: ref.id, mensagem: 'Recebido. Chama o suporte para verificar.' });
};
