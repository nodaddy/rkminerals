"use client";

import { createContext, useContext, useState, useEffect } from "react";
import {
  loginWithEmailAndPassword,
  logout as firebaseLogout,
  subscribeToAuthChanges,
  getUserClaims,
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
  const [userRole, setUserRole] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Fetch user claims including role
  const fetchUserClaims = async (currentUser) => {
    if (!currentUser) {
      setUserRole(null);
      return;
    }

    const claims = await getUserClaims(currentUser);
    if (claims && claims.companyId) {
      setUserRole(claims?.role || "admin");
      setCompanyId(claims?.companyId);
    } else {
      setUserRole("user"); // Default role if none is specified
      // break the application and do not allow the user to use the application
      console.log("No companyId found");
      // break the application
      throw new Error("No companyId found");
    }
  };

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (currentUser) => {
      setUser(currentUser);
      setIsLoggedIn(!!currentUser);

      // Get user claims including role
      await fetchUserClaims(currentUser);

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

    // Fetch user claims after successful login
    await fetchUserClaims(user);

    setLoading(false);
    return true;
  };

  // Logout
  const logout = async () => {
    setLoading(true);
    const { success, error } = await firebaseLogout();

    if (!success) {
      setAuthError(error);
    } else {
      // Clear user role on logout
      setUserRole(null);
    }

    setLoading(false);
    return success;
  };

  // Values to be provided by the context
  const contextValue = {
    // State
    isLoggedIn,
    user,
    userRole,
    loading,
    companyId,
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
