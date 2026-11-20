// GET/POST /api/admin-data?section=dashboard|casas|pagamentos|chaves
// header x-admin-pwd ou body.adminPwd. Firestore.
const { getFs, isAdmin } = require('../lib/firebase');

function mesAtual() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}
function snapToList(snap) { return snap.docs.map(d => ({ id: d.id, ...d.data() })); }

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const pwd = req.headers['x-admin-pwd'] || (req.body && req.body.adminPwd);
  if (!isAdmin({ headers: req.headers, body: { adminPwd: pwd } })) {
    return res.status(401).json({ error: 'Senha admin incorreta' });
  }

  const section = (req.query && req.query.section) || (req.body && req.body.section) || 'dashboard';
  const fs = getFs();
  const now = Date.now();
  const inicioMes = mesAtual();

  if (section === 'dashboard') {
    const [casasS, pagS, cfgDoc] = await Promise.all([
      fs.collection('casas').get(),
      fs.collection('pagamentos').get(),
      fs.collection('config').doc('main').get()
    ]);
    const casaList = snapToList(casasS);
    const cfg = cfgDoc.data() || {};
    let ativas = 0, trial = 0, vencendo7 = 0, bloqueadas = 0;
    const proximos = [];
    for (const c of casaList) {
      const venc = c.status === 'ativo' ? c.ativoAte : c.trialFim;
      if (c.status === 'ativo' && venc > now) ativas++;
      else if (c.status === 'trial' && venc > now) trial++;
      else bloqueadas++;
      if (venc > now && venc < now + 7 * 86400000) { vencendo7++; proximos.push({ id: c.id, nome: c.nome, vencimento: venc, status: c.status }); }
    }
    proximos.sort((a, b) => a.vencimento - b.vencimento);

    const pagList = snapToList(pagS);
    const aprovados = pagList.filter(p => p.status === 'aprovado');
    const receitaMes = aprovados.filter(p => (p.aprovadoEm || p.data) >= inicioMes).reduce((s, p) => s + Number(p.valor || 0), 0);
    const receitaTotal = aprovados.reduce((s, p) => s + Number(p.valor || 0), 0);
    const ultimos = aprovados.sort((a, b) => (b.aprovadoEm || b.data) - (a.aprovadoEm || a.data)).slice(0, 10);

    return res.json({
      mensalidade: cfg.mensalidade || 29.90, trialDias: cfg.trialDias || 7,
      mpConfigurado: !!cfg.mpToken,
      receitaMes, receitaTotal,
      ativas, trial, vencendo7, bloqueadas,
      totalCasas: casaList.length,
      proximosVencimentos: proximos.slice(0, 10),
      ultimosPagamentos: ultimos
    });
  }

  if (section === 'casas') {
    const casasS = await fs.collection('casas').get();
    const lista = snapToList(casasS).map(c => ({
      id: c.id, casaId: c.casaId, nome: c.nome, status: c.status, plano: c.plano,
      trialFim: c.trialFim || null, ativoAte: c.ativoAte || null,
      vencimento: c.status === 'ativo' ? c.ativoAte : c.trialFim,
      criadoEm: c.criadoEm
    })).sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
    return res.json({ casas: lista });
  }

  if (section === 'pagamentos') {
    const pagS = await fs.collection('pagamentos').get();
    let lista = snapToList(pagS);
    const filtro = (req.query && req.query.filtro) || 'todos';
    if (filtro !== 'todos') lista = lista.filter(p => p.status === filtro);
    const busca = (req.query && req.query.busca) || '';
    if (busca) {
      const b = busca.toLowerCase();
      lista = lista.filter(p => (p.casaId || '').toLowerCase().includes(b) || (p.mpId || '').toLowerCase().includes(b));
    }
    lista.sort((a, b) => (b.data || 0) - (a.data || 0));
    const somaAprovados = lista.filter(p => p.status === 'aprovado').reduce((s, p) => s + Number(p.valor || 0), 0);
    return res.json({ pagamentos: lista, somaAprovados });
  }

  if (section === 'chaves') {
    const chS = await fs.collection('chaves').get();
    const lista = snapToList(chS).sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
    return res.json({ chaves: lista });
  }

  return res.status(400).json({ error: 'section inválida' });
};
