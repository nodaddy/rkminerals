"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "../../../context/AppContext";
import styles from "../../page.module.css";

// Import components
import Sidebar from "./components/Sidebar";
import Inventory from "./components/Inventory";
import Summary from "./components/Summary";
import IncomingEntries from "./components/IncomingEntries";
import ProductionEntries from "./components/ProductionEntries";
import DispatchEntries from "./components/DispatchEntries";
import Audit from "./components/Audit";
import Admin from "./components/Admin";
import Bags from "./components/Bags";
import Styles from "./components/Styles";

export default function StockRegister() {
  const { isLoggedIn, logout, loading, userRole, companyId } = useAppContext();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("summary");
  const [stockItems, setStockItems] = useState([
    {
      id: 1,
      name: "Iron Ore",
      quantity: 250,
      unit: "Tons",
      lastUpdated: "2023-04-01",
    },
    {
      id: 2,
      name: "Copper",
      quantity: 120,
      unit: "Tons",
      lastUpdated: "2023-04-03",
    },
    {
      id: 3,
      name: "Bauxite",
      quantity: 180,
      unit: "Tons",
      lastUpdated: "2023-04-05",
    },
    {
      id: 4,
      name: "Limestone",
      quantity: 340,
      unit: "Tons",
      lastUpdated: "2023-04-07",
    },
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    // Redirect if not logged in
    if (!isLoggedIn && !loading) {
      router.push("/");
    }
  }, [isLoggedIn, loading, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  // Show loading state or redirect if not authenticated
  if (loading || !isLoggedIn) {
    return <div className={styles.main}>Loading...</div>;
  }

  // Block access to admin section for non-admin users
  if (activeSection === "admin" && userRole !== "admin") {
    setActiveSection("inventory");
  }

  return (
    <div className="dashboard-container">
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        handleLogout={handleLogout}
        userRole={userRole}
        companyId={companyId}
      />

      <div className="dashboard-content">
        <div className="dashboard-main">
          <div className="dashboard-header">
            <div className="dashboard-title">
              {activeSection === "dashboard" && "Dashboard"}
              {activeSection === "inventory" && "Stock Register"}
              {activeSection === "summary" && "Summary"}
              {activeSection === "incoming" && "Incoming Entries"}
              {activeSection === "production" && "Production Entries"}
              {activeSection === "dispatch" && "Dispatch Entries"}
              {activeSection === "bags" && "Bags Inventory"}
              {activeSection === "audit" && "Audit"}
              {activeSection === "admin" && "Administration"}
            </div>
            <div className="dashboard-actions">
              {activeSection === "inventory" && (
                <button
                  className="button-secondary"
                  onClick={() => setIsAddModalOpen(true)}
                >
                  <span>+ Add New Item</span>
                </button>
              )}
            </div>
          </div>

          {activeSection === "inventory" && (
            <Inventory
              stockItems={stockItems}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              setSelectedItem={setSelectedItem}
              setIsAddModalOpen={setIsAddModalOpen}
              userRole={userRole}
            />
          )}

          {activeSection === "summary" && <Summary />}
          {activeSection === "incoming" && <IncomingEntries />}
          {activeSection === "production" && <ProductionEntries />}
          {activeSection === "dispatch" && <DispatchEntries />}
          {activeSection === "bags" && <Bags />}
          {activeSection === "audit" && <Audit userRole={userRole} />}
          {activeSection === "admin" && userRole === "admin" && <Admin />}
        </div>
      </div>

      <Styles />
    </div>
  );
}
