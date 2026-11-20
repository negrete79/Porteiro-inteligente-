// POST /api/check-payment
// body: { casaId, paymentDbId? }
// Botão "JÁ PAGUEI": consulta MP; se approved, ativa a casa na hora. Firestore.
const { getFs, getMpToken } = require('../lib/firebase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { casaId, paymentDbId } = req.body || {};
  if (!casaId) return res.status(400).json({ error: 'casaId obrigatório' });

  const fs = getFs();
  const token = await getMpToken();

  let payKey = paymentDbId, pay;
  if (payKey) {
    const s = await fs.collection('pagamentos').doc(payKey).get();
    pay = s.exists ? s.data() : null;
  } else {
    const snap = await fs.collection('pagamentos').where('casaId', '==', casaId).get();
    if (!snap.empty) {
      const entries = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.data || 0) - (a.data || 0));
      const pendente = entries.find(v => v.status === 'pendente') || entries[0];
      payKey = pendente.id; pay = pendente;
    }
  }

  if (!pay || !pay.mpId) {
    return res.json({ activated: false, motivo: 'Nenhum pagamento encontrado. Gere o QR Code primeiro.' });
  }
  if (pay.status === 'aprovado') {
    const cs = await fs.collection('casas').doc(casaId).get();
    const cv = cs.data();
    const dv = cv && (cv.status === 'ativo' ? cv.ativoAte : cv.trialFim);
    if (cv && dv > Date.now() && cv.status === 'ativo') {
      return res.json({ activated: true, vencimento: dv });
    }
  }

  let status = pay.status;
  if (token) {
    try {
      const r = await fetch('https://api.mercadopago.com/v1/payments/' + pay.mpId, {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (r.ok) {
        const j = await r.json();
        status = j.status === 'approved' ? 'aprovado' : (j.status === 'rejected' ? 'recusado' : 'pendente');
      }
    } catch (e) {}
  }

  const now = Date.now();
  if (status === 'aprovado') {
    const novoVenc = now + 30 * 86400000;
    await fs.collection('casas').doc(casaId).update({
      status: 'ativo', ativoAte: novoVenc, plano: 'mensal', ultimoPagamentoData: now
    });
    await fs.collection('pagamentos').doc(payKey).update({ status: 'aprovado', aprovadoEm: now });
    return res.json({ activated: true, vencimento: novoVenc });
  }

  return res.json({ activated: false, status, motivo: status === 'pendente' ? 'Pagamento ainda não confirmado pelo Mercado Pago. Aguarde 1-2 minutos.' : 'Pagamento recusado.' });
};
