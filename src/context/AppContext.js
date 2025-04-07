"use client";

import { createContext, useContext, useState, useEffect } from "react";
import {
  loginWithEmailAndPassword,
  logout as firebaseLogout,
  subscribeToAuthChanges,
} from "../firebase/services/auth";

// Create the AppContext
const AppContext = createContext();

// Custom hook to use the AppContext
export const useAppContext = () => {
  return useContext(AppContext);
};

// Provider component that wraps the app and provides the context
export function AppContextProvider({ children }) {
  // Define your state variables here
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setIsLoggedIn(!!currentUser);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Login with email and password
  const login = async (email, password) => {
    setLoading(true);
    setAuthError(null);

    const { user, error } = await loginWithEmailAndPassword(email, password);

    if (error) {
      setAuthError(error);
      setLoading(false);
      return false;
    }

    setLoading(false);
    return true;
  };

  // Logout
  const logout = async () => {
    setLoading(true);
    const { success, error } = await firebaseLogout();

    if (!success) {
      setAuthError(error);
    }

    setLoading(false);
    return success;
  };

  // Values to be provided by the context
  const contextValue = {
    // State
    isLoggedIn,
    user,
    loading,
    authError,

    // Methods
    login,
    logout,
    setAuthError,
  };

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
}
