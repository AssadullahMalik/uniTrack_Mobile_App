import { auth } from "@/firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";

export const signup = (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

/**
 * Sign in with email/password and enforce email verification.
 * Reloads user, checks emailVerified; if false, signs out and throws.
 * Use only for production login flow.
 */
export const loginWithEmailVerification = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  await user.reload();
  const refreshed = auth.currentUser;
  if (!refreshed || !refreshed.emailVerified) {
    await signOut(auth);
    throw new Error("Email not verified. Please verify before logging in.");
  }
  return refreshed;
};

/** Legacy: sign in only (no verification check). Prefer loginWithEmailVerification. */
export const login = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const logout = () => {
  return signOut(auth);
};

export const resetPassword = (email) => {
  return sendPasswordResetEmail(auth, email);
};

/** Resend verification email. Call only while user is signed in (e.g. right before signOut after failed login). */
export const resendEmailVerification = () => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in.");
  return sendEmailVerification(user);
};