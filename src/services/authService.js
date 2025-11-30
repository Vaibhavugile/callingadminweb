// src/services/authService.js
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export async function signupWithEmail(email, password, displayName) {
  const res = await createUserWithEmailAndPassword(auth, email, password);
  const user = res.user;
  const profileRef = doc(db, 'userProfiles', user.uid);
  await setDoc(profileRef, {
    displayName: displayName || user.displayName || '',
    email: user.email || '',
    role: 'user',
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp()
  }, { merge: true });
  return user;
}

export async function signInEmail(email, password) {
  const res = await signInWithEmailAndPassword(auth, email, password);
  const user = res.user;
  const profileRef = doc(db, 'userProfiles', user.uid);
  await setDoc(profileRef, { lastLoginAt: serverTimestamp(), email: user.email }, { merge: true });
  return user;
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const res = await signInWithPopup(auth, provider);
  const user = res.user;
  const profileRef = doc(db, 'userProfiles', user.uid);
  await setDoc(profileRef, {
    displayName: user.displayName || '',
    email: user.email || '',
    role: 'user',
    lastLoginAt: serverTimestamp()
  }, { merge: true });
  return user;
}

export async function signOutUser() {
  await signOut(auth);
}
