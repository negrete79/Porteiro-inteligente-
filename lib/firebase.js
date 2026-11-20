// Firebase Admin SDK — init compartilhado para todas as /api.
// Firestore (casas/config/pagamentos/chaves) + RTDB (legacy/back-compat).
// Requer env vars no Vercel: FB_CLIENT_EMAIL, FB_PRIVATE_KEY
const admin = require('firebase-admin');
const DB_URL = 'https://doorvi-video-default-rtdb.firebaseio.com';
const PROJECT = 'doorvi-video';

let _db = null, _fs = null;
function _init() {
  if (admin.apps.length) return;
  const pk = (process.env.FB_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!process.env.FB_CLIENT_EMAIL || !pk) {
    throw new Error('Credenciais Firebase Admin ausentes. Configure FB_CLIENT_EMAIL e FB_PRIVATE_KEY no Vercel.');
  }
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: PROJECT,
      clientEmail: process.env.FB_CLIENT_EMAIL,
      privateKey: pk
    }),
    databaseURL: DB_URL
  });
}
function getDb() { _init(); if (!_db) _db = admin.database(); return _db; }   // RTDB (legacy)
function getFs() { _init(); if (!_fs) _fs = admin.firestore(); return _fs; }  // Firestore (casas)

// senha simples do admin (env var ADMIN_PASSWORD)
function isAdmin(req) {
  const pwd = req.headers['x-admin-pwd'] || (req.body && req.body.adminPwd) || '';
  return pwd && pwd === (process.env.ADMIN_PASSWORD || 'portalink2026');
}

// token MP guardado no Firestore (config/main, base64) — lê/decodifica
async function getMpToken() {
  const doc = await getFs().collection('config').doc('main').get();
  if (!doc.exists) return null;
  const t = doc.data().mpToken;
  if (!t) return null;
  try { return Buffer.from(t, 'base64').toString('utf8'); }
  catch (e) { return null; }
}

module.exports = { getDb, getFs, isAdmin, getMpToken, admin };
