// Wgrywa pliki z katalogu protected/ do Firestore (kolekcja modules).
// Uruchamiany w GitHub Actions z kontem serwisowym (zmienna GOOGLE_APPLICATION_CREDENTIALS).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const admin = require('firebase-admin');

const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) { console.error('Brak FIREBASE_PROJECT_ID'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
const db = admin.firestore();

(async () => {
  const dir = process.env.MODULY_DIR || path.join(__dirname, '..', 'protected');
  const files = fs.readdirSync(dir).filter(f => /^[a-z0-9_-]+\.js$/.test(f));
  if (!files.length) { console.error('Brak modułów w protected/'); process.exit(1); }
  for (const f of files) {
    const id = f.replace(/\.js$/, '');
    const code = fs.readFileSync(path.join(dir, f), 'utf8');
    if (Buffer.byteLength(code) > 900000) { console.error(`Moduł ${id} jest za duży dla Firestore`); process.exit(1); }
    const v = crypto.createHash('sha256').update(code).digest('hex').slice(0, 16);
    await db.collection('modules').doc(id).set({ code, v, updated: admin.firestore.FieldValue.serverTimestamp() });
    console.log(`Wgrano moduł ${id} (${code.length} znaków, wersja ${v})`);
  }
})().catch(e => { console.error(e.message || e); process.exit(1); });
