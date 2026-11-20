// POST /api/activate-key
// body: { casaId, codigo }
// Morador digita chave avulsa. Se válida e não usada, ativa a casa pelos dias da chave. Firestore.
const { getFs } = require('../lib/firebase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { casaId, codigo } = req.body || {};
  if (!casaId || !codigo) return res.status(400).json({ error: 'casaId e codigo obrigatórios' });

  const fs = getFs();
  const code = String(codigo).trim().toUpperCase();

  const snap = await fs.collection('chaves').where('codigo', '==', code).limit(1).get();
  if (snap.empty) return res.json({ activated: false, motivo: 'Chave inválida. Verifique e tente novamente.' });

  const keyDoc = snap.docs[0];
  const keyId = keyDoc.id;
  const chave = keyDoc.data();
  if (chave.usado) return res.json({ activated: false, motivo: 'Esta chave já foi usada.' });

  const now = Date.now();
  const dias = Number(chave.dias) || 30;
  const venc = dias >= 36500 ? now + 36500 * 86400000 : now + dias * 86400000;

  await fs.collection('chaves').doc(keyId).update({ usado: true, casaId, usadaEm: now });

  const plano = dias >= 36500 ? 'vitalicio' : (dias >= 365 ? 'anual' : (dias >= 90 ? 'trimestral' : (dias >= 60 ? 'semestral' : 'mensal')));
  await fs.collection('casas').doc(casaId).update({
    status: 'ativo', ativoAte: venc, plano, ultimoPagamentoData: now
  });

  await fs.collection('pagamentos').add({
    casaId, valor: 0, status: 'aprovado', data: now,
    mpId: 'chave_' + keyId, method: 'chave',
    aprovadoEm: now, chaveCodigo: code
  });

  return res.json({ activated: true, dias, vencimento: venc, plano });
};
