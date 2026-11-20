// POST /api/register-casa
// body: { casaId, nome? }
// Cria trial de 7 dias se a casa não existir. Retorna status atual.
// Firestore: collection "casas", doc = casaId. Campos: casaId, nome, status, trialFim, ativoAte.
const { getFs } = require('../lib/firebase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { casaId, nome } = req.body || {};
  if (!casaId) return res.status(400).json({ error: 'casaId obrigatório' });

  const fs = getFs();
  const ref = fs.collection('casas').doc(casaId);
  const snap = await ref.get();
  const now = Date.now();

  const cfgDoc = await fs.collection('config').doc('main').get();
  const cfg = cfgDoc.data() || {};
  const trialDias = cfg.trialDias || 7;
  const mensalidade = cfg.mensalidade || 29.90;

  if (!snap.exists) {
    const trialFim = now + trialDias * 86400000;
    await ref.set({
      casaId,
      nome: nome || 'Nova casa - aguardando nome',
      status: 'trial',
      trialFim,
      ativoAte: null,
      criadoEm: now,
      plano: 'trial'
    });
    return res.json({ status: 'trial', vencimento: trialFim, bloqueado: false, mensalidade, novo: true, trialFim, ativoAte: null });
  }

  const d = snap.data();
  const deadline = d.status === 'ativo' ? d.ativoAte : d.trialFim;
  const bloqueado = d.status === 'bloqueado' || (deadline || 0) < now;
  if (bloqueado && d.status !== 'bloqueado') await ref.update({ status: 'bloqueado' });

  return res.json({
    status: bloqueado ? 'bloqueado' : d.status,
    vencimento: deadline || 0,
    bloqueado,
    mensalidade,
    nome: d.nome,
    novo: false,
    trialFim: d.trialFim || null,
    ativoAte: d.ativoAte || null
  });
};
