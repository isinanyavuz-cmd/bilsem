/* Hesap girişi (Firebase Auth) ve ilerlemenin buluta kaydı (Firestore).
 * ES modülüdür: index.html içinde <script type="module"> ile yüklenir.
 * Firebase SDK'sı js/vendor/firebase.js içinde tek dosya olarak gelir (tools/firebase-entry.js'ten derlenir).
 *
 * Dışarıya iki nesne açar:
 *   window.BilsemAuth  -> signIn, signUp, forgot, google, apple, out
 *   window.BilsemSync  -> push(data): ilerlemeyi bulutta kullanıcının kaydına gönderir (kısa gecikmeli)
 * Durum değişince "bilsem:auth" olayı yayınlanır (detail: { configured, user, cloud, error }).
 */

import {
  initializeApp, getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  updateProfile, GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut, sendPasswordResetEmail, getFirestore, doc, getDoc, setDoc, serverTimestamp,
} from './vendor/firebase.js';

const cfg = window.BILSEM_FIREBASE || null;
const app = cfg ? initializeApp(cfg) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MSG = {
  'auth/invalid-credential': 'E-posta ya da şifre yanlış.',
  'auth/invalid-login-credentials': 'E-posta ya da şifre yanlış.',
  'auth/user-not-found': 'E-posta ya da şifre yanlış.',
  'auth/wrong-password': 'E-posta ya da şifre yanlış.',
  'auth/email-already-in-use': 'Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.',
  'auth/weak-password': 'Şifre en az 6 karakter olmalı.',
  'auth/invalid-email': 'E-posta adresi geçersiz.',
  'auth/missing-email': 'Önce e-posta adresini yaz.',
  'auth/too-many-requests': 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.',
  'auth/network-request-failed': 'İnternet bağlantısı yok gibi görünüyor.',
  'auth/popup-closed-by-user': 'Giriş penceresi kapatıldı.',
  'auth/cancelled-popup-request': 'Giriş penceresi kapatıldı.',
  'auth/account-exists-with-different-credential': 'Bu e-posta başka bir giriş yöntemiyle açılmış (ör. Google).',
  'auth/operation-not-allowed': 'Bu giriş yöntemi Firebase’de açık değil.',
  'auth/unauthorized-domain': 'Bu adres Firebase’de yetkili alan adları arasında değil.',
};
function fail(e) {
  const err = new Error((e && MSG[e.code]) || 'Bir sorun oldu. Tekrar dene.');
  err.code = e && e.code;
  return err;
}
function need() {
  if (!auth) throw new Error('Giriş henüz ayarlanmadı.');
}
function emit(detail) {
  window.dispatchEvent(new CustomEvent('bilsem:auth', { detail: detail }));
}

/* ---------- bulut kaydı ---------- */
let uid = null;          // şu an giriş yapmış hesap
let pending = null;      // henüz gönderilmemiş ilerleme metni
let pendingUid = null;
let timer = null;

async function flush() {
  clearTimeout(timer); timer = null;
  if (!pending || !pendingUid) return;
  const text = pending, who = pendingUid;
  pending = null;
  try {
    await setDoc(doc(db, 'users', who), { data: text, updatedAt: serverTimestamp() });
  } catch (e) {
    // Gönderilemedi: bir sonraki değişiklikte ya da bağlantı geri gelince yeniden denenir.
    if (!pending) { pending = text; pendingUid = who; }
    window.addEventListener('online', flush, { once: true });
  }
}

async function fetchCloud(who) {
  const snap = await getDoc(doc(db, 'users', who));
  return snap.exists() && typeof snap.data().data === 'string' ? snap.data().data : null;
}

window.BilsemSync = {
  push(data) {
    if (!db || !uid) return;
    pending = JSON.stringify(data);
    pendingUid = uid;
    clearTimeout(timer);
    timer = setTimeout(flush, 1200);
  },
};
window.addEventListener('pagehide', () => { flush(); });

/* ---------- giriş ---------- */
function emailOf(raw) {
  const e = String(raw || '').trim().toLowerCase();
  if (!e) throw new Error('E-posta adresini yaz.');
  if (!EMAIL_RE.test(e)) throw new Error('E-posta adresi geçersiz.');
  return e;
}
function passwordOf(raw) {
  const pw = String(raw || '');
  if (pw.length < 6) throw new Error('Şifre en az 6 karakter olmalı.');
  return pw;
}
function providerSignIn(provider) {
  return signInWithPopup(auth, provider).catch((e) => {
    // Açılır pencere engellendiyse tam sayfa yönlendirmesiyle devam et.
    if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) {
      return signInWithRedirect(auth, provider);
    }
    throw fail(e);
  });
}

window.BilsemAuth = {
  configured: !!auth,
  async signIn(email, password) {
    need();
    const e = emailOf(email);
    try { await signInWithEmailAndPassword(auth, e, password); } catch (err) { throw fail(err); }
  },
  async signUp(email, password, name) {
    need();
    const e = emailOf(email), pw = passwordOf(password);
    const shown = String(name || '').trim().slice(0, 30) || e.split('@')[0];
    try {
      const cred = await createUserWithEmailAndPassword(auth, e, pw);
      await updateProfile(cred.user, { displayName: shown });
    } catch (err) { throw fail(err); }
  },
  /* Şifre sıfırlama bağlantısını e-postaya gönderir. Hesabın var olup olmadığı bilgisi verilmez. */
  async forgot(email) {
    need();
    const e = emailOf(email);
    try { await sendPasswordResetEmail(auth, e); } catch (err) { throw fail(err); }
  },
  google() {
    need();
    const p = new GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    return providerSignIn(p);
  },
  apple() {
    need();
    const p = new OAuthProvider('apple.com');
    p.addScope('name');
    p.addScope('email');
    return providerSignIn(p);
  },
  async out() {
    need();
    await flush();          // son değişiklik de buluta gitsin
    uid = null;
    await signOut(auth);
  },
};

if (auth) {
  // Açılır pencere yerine yönlendirme ile dönüldüyse sonucu al (hata varsa olay yoluyla gösterilir).
  getRedirectResult(auth).catch((e) => { if (e && e.code) emit({ configured: true, user: null, error: fail(e).message }); });

  onAuthStateChanged(auth, async (u) => {
    if (!u) {
      uid = null;
      emit({ configured: true, user: null });
      return;
    }
    let cloud;
    try {
      cloud = await fetchCloud(u.uid);
    } catch (e) {
      // Bulut okunamadı: ilerleme üzerine yazılmasın diye giriş reddedilir.
      cloud = undefined;
    }
    if (cloud === undefined) {
      emit({ configured: true, user: null, error: 'Kayıtlara ulaşılamadı. İnternet bağlantını kontrol edip tekrar giriş yap.' });
      try { await signOut(auth); } catch (e) { /* zaten çıkılmış olabilir */ }
      return;
    }
    uid = u.uid;
    const label = u.displayName || u.email || 'Hesap';
    emit({ configured: true, user: { uid: u.uid, name: label }, cloud: cloud });
  });
} else {
  emit({ configured: false, user: null });
}
