import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../config";

// Sign in with email and password
export const loginWithEmailAndPassword = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

// Sign out
export const logout = async () => {
  try {
    await signOut(auth);
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Observer for auth state changes
export const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Get user custom claims (including role)
export const getUserClaims = async (user) => {
  if (!user) return null;

  try {
    // Force token refresh to get the latest claims
    await user.getIdToken(true);

    // Get the ID token result which includes the claims
    const idTokenResult = await user.getIdTokenResult();

    // Return the custom claims
    return idTokenResult.claims;
  } catch (error) {
    console.error("Error getting user claims:", error);
    return null;
  }
};
