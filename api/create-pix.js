// POST /api/create-pix
// body: { casaId }
// Cria cobrança PIX dinâmica via Mercado Pago. Retorna QR (base64) + copia e cola + paymentId.
// Firestore: lê casa + config, grava em collection "pagamentos".
const { getFs, getMpToken } = require('../lib/firebase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { casaId } = req.body || {};
  if (!casaId) return res.status(400).json({ error: 'casaId obrigatório' });

  const fs = getFs();
  const token = await getMpToken();
  if (!token) return res.status(400).json({ error: 'Mercado Pago não configurado. Peça ao admin para configurar o Access Token.' });

  const cfgDoc = await fs.collection('config').doc('main').get();
  const cfg = cfgDoc.data() || {};
  const valor = Number(cfg.mensalidade || 29.90);

  const casaDoc = await fs.collection('casas').doc(casaId).get();
  const casa = casaDoc.data() || {};
  const now = Date.now();
  const expira = now + 24 * 3600000;

  const payload = {
    transaction_amount: valor,
    description: 'PortaLink — Mensalidade (' + (casa.nome || 'Casa') + ')',
    payment_method_id: 'pix',
    date_of_expiration: new Date(expira).toISOString(),
    payer: { email: 'casa_' + String(casaId).substring(0, 8) + '@portalink.app', first_name: casa.nome || 'Morador' },
    metadata: { casaId }
  };

  let r;
  try {
    r = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'X-Idempotency-Key': casaId + '_' + now },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    return res.status(502).json({ error: 'Falha ao conectar Mercado Pago' });
  }

  const j = await r.json();
  if (!r.ok) return res.status(502).json({ error: 'Mercado Pago rejeitou: ' + (j.message || JSON.stringify(j)) });

  const td = (j.point_of_interaction || {}).transaction_data || {};
  const qrCode = td.qr_code || '';
  const qrBase64 = td.qr_code_base64 || '';

  const payRef = await fs.collection('pagamentos').add({
    casaId, valor, status: 'pendente',
    data: now, mpId: String(j.id),
    qrCode, qrBase64,
    preferenceId: String(j.id),
    method: 'pix', expira
  });
  const paymentDbId = payRef.id;
  await fs.collection('casas').doc(casaId).update({ ultimoPagamento: paymentDbId });

  return res.json({ paymentId: j.id, paymentDbId, qrCode, qrBase64, valor, expira });
};
