export { initializeApp } from 'firebase/app';
export {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  updateProfile, GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut, sendPasswordResetEmail,
} from 'firebase/auth';
export { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
