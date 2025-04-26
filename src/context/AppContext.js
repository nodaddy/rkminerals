"use client";

import { createContext, useContext, useState, useEffect } from "react";
import {
  loginWithEmailAndPassword,
  logout as firebaseLogout,
  subscribeToAuthChanges,
  getUserClaims,
} from "../firebase/services/auth";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import app from "../firebase/config";

const db = getFirestore(app);

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

  // Entity state variables
  const [products, setProducts] = useState([]);
  const [machines, setMachines] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [bagTypes, setBagTypes] = useState([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);

  // Fetch user claims including role
  const fetchUserClaims = async (currentUser) => {
    if (!currentUser) {
      setUserRole(null);
      return;
    }

    const claims = await getUserClaims(currentUser);
    if (claims && claims.companyId) {
      setUserRole(claims?.role);
      setCompanyId(claims?.companyId);
    } else {
      setUserRole("user"); // Default role if none is specified
      // break the application and do not allow the user to use the application
      console.log("No companyId found");
      // break the application
      throw new Error("No companyId found");
    }
  };

  // Fetch all entities from Firestore
  const fetchEntities = async () => {
    if (!companyId) return;

    setEntitiesLoading(true);
    try {
      const companyRef = doc(db, "companies", companyId);

      // Fetch products
      const productsCollectionRef = collection(companyRef, "products");
      const productsQuery = query(
        productsCollectionRef,
        orderBy("createdAt", "desc")
      );
      const productsSnapshot = await getDocs(productsQuery);
      const productsData = [];
      productsSnapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data() });
      });
      setProducts(productsData);

      // Fetch machines
      const machinesCollectionRef = collection(companyRef, "machines");
      const machinesQuery = query(
        machinesCollectionRef,
        orderBy("createdAt", "desc")
      );
      const machinesSnapshot = await getDocs(machinesQuery);
      const machinesData = [];
      machinesSnapshot.forEach((doc) => {
        machinesData.push({ id: doc.id, ...doc.data() });
      });
      setMachines(machinesData);

      // Fetch suppliers
      const suppliersCollectionRef = collection(companyRef, "suppliers");
      const suppliersQuery = query(
        suppliersCollectionRef,
        orderBy("createdAt", "desc")
      );
      const suppliersSnapshot = await getDocs(suppliersQuery);
      const suppliersData = [];
      suppliersSnapshot.forEach((doc) => {
        suppliersData.push({ id: doc.id, ...doc.data() });
      });
      setSuppliers(suppliersData);

      // Fetch buyers
      const buyersCollectionRef = collection(companyRef, "buyers");
      const buyersQuery = query(
        buyersCollectionRef,
        orderBy("createdAt", "desc")
      );
      const buyersSnapshot = await getDocs(buyersQuery);
      const buyersData = [];
      buyersSnapshot.forEach((doc) => {
        buyersData.push({ id: doc.id, ...doc.data() });
      });
      setBuyers(buyersData);

      // Fetch bag types
      const bagTypesCollectionRef = collection(companyRef, "bagTypes");
      const bagTypesQuery = query(
        bagTypesCollectionRef,
        orderBy("createdAt", "desc")
      );
      const bagTypesSnapshot = await getDocs(bagTypesQuery);
      const bagTypesData = [];
      bagTypesSnapshot.forEach((doc) => {
        bagTypesData.push({ id: doc.id, ...doc.data() });
      });
      setBagTypes(bagTypesData);
    } catch (error) {
      console.error("Error fetching entities:", error);
    } finally {
      setEntitiesLoading(false);
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

  // Fetch entities when companyId is available
  useEffect(() => {
    if (companyId) {
      fetchEntities();
    }
  }, [companyId]);

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
    products,
    machines,
    suppliers,
    buyers,
    bagTypes,
    entitiesLoading,

    // Methods
    login,
    logout,
    setAuthError,
    fetchEntities, // Expose method to refresh entities
  };

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
}
