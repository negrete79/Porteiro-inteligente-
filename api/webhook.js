// POST /api/webhook  (ou GET para validação MP)
// Mercado Pago envia { type:"payment", data:{ id:"123" } } quando o PIX é pago.
// Consulta o pagamento no MP; se approved, ativa a casa por 30 dias automaticamente. Firestore.
const { getFs, getMpToken } = require('../lib/firebase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') return res.status(200).json({ ok: true, service: 'portalink-webhook' });
  if (req.method !== 'POST') return res.status(405).end();

  const body = req.body || {};
  const mpPaymentId = body.data && body.data.id ? String(body.data.id) : (body.resource ? String(body.resource).split('/').pop() : null);
  if (!mpPaymentId) return res.status(200).json({ ignored: true });

  try {
    const fs = getFs();
    const token = await getMpToken();

    const paySnap = await fs.collection('pagamentos').where('mpId', '==', mpPaymentId).limit(1).get();
    if (paySnap.empty) return res.status(200).json({ ignored: 'no_local_payment' });

    const payDoc = paySnap.docs[0];
    const payKey = payDoc.id;
    const pay = payDoc.data();
    if (pay.status === 'aprovado') return res.status(200).json({ already: true });

    let status = 'pendente';
    if (token) {
      try {
        const r = await fetch('https://api.mercadopago.com/v1/payments/' + mpPaymentId, {
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
      await fs.collection('casas').doc(pay.casaId).update({
        status: 'ativo', ativoAte: novoVenc, plano: 'mensal', ultimoPagamentoData: now
      });
      await fs.collection('pagamentos').doc(payKey).update({ status: 'aprovado', aprovadoEm: now });
      return res.status(200).json({ activated: true, casaId: pay.casaId, vencimento: novoVenc });
    } else {
      await fs.collection('pagamentos').doc(payKey).update({ status });
      return res.status(200).json({ status });
    }
  } catch (e) {
    return res.status(200).json({ error: e.message });
  }
};
