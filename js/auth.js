/* Hesap girişi (Firebase Auth) ve ilerlemenin buluta kaydı (Firestore).
 * ES modülüdür: index.html içinde <script type="module"> ile yüklenir.
 * Firebase SDK'sı js/vendor/firebase.js içinde tek dosya olarak gelir (tools/firebase-entry.js'ten derlenir).
 *
 * Dışarıya iki nesne açar:
 *   window.BilsemAuth  -> signIn, signUp, google, apple, out
 *   window.BilsemSync  -> push(data): ilerlemeyi bulutta kullanıcının kaydına gönderir (kısa gecikmeli)
 * Durum değişince "bilsem:auth" olayı yayınlanır (detail: { configured, user, cloud }).
 */

import {
  initializeApp, getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  updateProfile, GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut, getFirestore, doc, getDoc, setDoc, serverTimestamp,
} from './vendor/firebase.js';

const cfg = window.BILSEM_FIREBASE || null;
const app = cfg ? initializeApp(cfg) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

/* Kullanıcı adı, Firebase e-posta/şifre girişi için gizli bir e-postaya çevrilir. Bu adres hiçbir yere posta göndermez. */
const USER_RE = /^[a-z0-9_]{3,20}$/;
const EMAIL_DOMAIN = 'kullanici.bilsem.app';

const MSG = {
  'auth/invalid-credential': 'Kullanıcı adı ya da şifre yanlış.',
  'auth/invalid-login-credentials': 'Kullanıcı adı ya da şifre yanlış.',
  'auth/user-not-found': 'Kullanıcı adı ya da şifre yanlış.',
  'auth/wrong-password': 'Kullanıcı adı ya da şifre yanlış.',
  'auth/email-already-in-use': 'Bu kullanıcı adı zaten alınmış.',
  'auth/weak-password': 'Şifre en az 6 karakter olmalı.',
  'auth/invalid-email': 'Kullanıcı adı geçersiz.',
  'auth/too-many-requests': 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.',
  'auth/network-request-failed': 'İnternet bağlantısı yok gibi görünüyor.',
  'auth/popup-closed-by-user': 'Giriş penceresi kapatıldı.',
  'auth/cancelled-popup-request': 'Giriş penceresi kapatıldı.',
  'auth/account-exists-with-different-credential': 'Bu e-posta başka bir giriş yöntemiyle açılmış.',
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
function usernameOf(raw) {
  const name = String(raw || '').trim().toLowerCase();
  if (!USER_RE.test(name)) throw new Error('Kullanıcı adı 3–20 karakter olmalı; yalnızca küçük harf, rakam ve _ kullanılabilir.');
  return name;
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
  async signIn(name, password) {
    need();
    const n = usernameOf(name);
    try { await signInWithEmailAndPassword(auth, n + '@' + EMAIL_DOMAIN, password); } catch (e) { throw fail(e); }
  },
  async signUp(name, password) {
    need();
    const n = usernameOf(name), pw = passwordOf(password);
    try {
      const cred = await createUserWithEmailAndPassword(auth, n + '@' + EMAIL_DOMAIN, pw);
      await updateProfile(cred.user, { displayName: n });
    } catch (e) { throw fail(e); }
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
