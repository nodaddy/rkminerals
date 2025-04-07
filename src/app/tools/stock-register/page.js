"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "../../../context/AppContext";
import styles from "../../page.module.css";

export default function StockRegister() {
  const { isLoggedIn, logout, loading } = useAppContext();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("inventory");
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

  // Filter stock items based on search term
  const filteredItems = stockItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  // Show loading state or redirect if not authenticated
  if (loading || !isLoggedIn) {
    return <div className={styles.main}>Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-sidebar">
        <div className="dashboard-sidebar-header">
          <div className="dashboard-logo">
            Stock Register <br />
            <sup style={{ fontSize: "14px", fontWeight: "300" }}>
              R.K. Minerals
            </sup>
          </div>
        </div>

        <div className="dashboard-sidebar-menu">
          <div
            className={`menu-item ${
              activeSection === "summary" ? "active" : ""
            }`}
            onClick={() => {
              setActiveSection("summary");
            }}
          >
            <span className="menu-item-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </span>
            Summary
          </div>

          <div
            className={`menu-item ${
              activeSection === "incoming" ? "active" : ""
            }`}
            onClick={() => setActiveSection("incoming")}
          >
            <span className="menu-item-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </span>
            Incoming Entries
          </div>

          <div
            className={`menu-item ${
              activeSection === "production" ? "active" : ""
            }`}
            onClick={() => setActiveSection("production")}
          >
            <span className="menu-item-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                <path d="M2 2l7.586 7.586"></path>
                <circle cx="11" cy="11" r="2"></circle>
              </svg>
            </span>
            Production Entries
          </div>

          <div
            className={`menu-item ${
              activeSection === "dispatch" ? "active" : ""
            }`}
            onClick={() => setActiveSection("dispatch")}
          >
            <span className="menu-item-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="1" y="3" width="15" height="13"></rect>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                <circle cx="18.5" cy="18.5" r="2.5"></circle>
              </svg>
            </span>
            Dispatch Entries
          </div>

          <div
            className={`menu-item ${activeSection === "audit" ? "active" : ""}`}
            onClick={() => setActiveSection("audit")}
          >
            <span className="menu-item-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 12H4a8 8 0 0 1 8 8v-4a8 8 0 0 1 8-8h2"></path>
                <path d="M2 4H4a8 8 0 0 1 8 8v-4a8 8 0 0 1 8-8h2"></path>
                <line x1="2" y1="20" x2="2" y2="20"></line>
              </svg>
            </span>
            Audit
          </div>

          <div
            className={`menu-item ${activeSection === "admin" ? "active" : ""}`}
            onClick={() => setActiveSection("admin")}
          >
            <span className="menu-item-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </span>
            Admin
          </div>
        </div>

        <div className="dashboard-sidebar-footer">
          <div className="menu-item" onClick={handleLogout}>
            <span className="menu-item-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </span>
            Logout
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-main">
          <div className="dashboard-header">
            <div className="dashboard-title">
              {activeSection === "dashboard" && "Dashboard"}
              {activeSection === "inventory" && "Stock Register"}
              {activeSection === "incoming" && "Incoming Entries"}
              {activeSection === "production" && "Production Entries"}
              {activeSection === "dispatch" && "Dispatch Entries"}
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
            <>
              <div className="dashboard-panel">
                <div className="dashboard-panel-header">
                  <div className="panel-title">Inventory List</div>
                  <div className="search-container">
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                  </div>
                </div>

                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Item Name</th>
                        <th>Quantity</th>
                        <th>Unit</th>
                        <th>Last Updated</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.length > 0 ? (
                        filteredItems.map((item) => (
                          <tr key={item.id}>
                            <td>{item.name}</td>
                            <td>{item.quantity}</td>
                            <td>{item.unit}</td>
                            <td>{item.lastUpdated}</td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  className="action-button edit"
                                  onClick={() => setSelectedItem(item)}
                                >
                                  Edit
                                </button>
                                <button className="action-button delete">
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="no-data">
                            No items found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="dashboard-panel">
                <div className="dashboard-panel-header">
                  <div className="panel-title">Summary</div>
                </div>

                <div className="summary-grid">
                  <div className="summary-card">
                    <div className="summary-value">{stockItems.length}</div>
                    <div className="summary-label">Total Items</div>
                  </div>

                  <div className="summary-card">
                    <div className="summary-value">
                      {stockItems.reduce((sum, item) => sum + item.quantity, 0)}
                    </div>
                    <div className="summary-label">Total Quantity</div>
                  </div>

                  <div className="summary-card">
                    <div className="summary-value">
                      {new Date().toLocaleDateString()}
                    </div>
                    <div className="summary-label">Last Refresh</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSection === "summary" && (
            <div className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div className="panel-title">Summary</div>
              </div>
              <div className="content-placeholder">
                <p>Summary will be available soon.</p>
              </div>
            </div>
          )}

          {activeSection === "incoming" && (
            <div className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div className="panel-title">Incoming Entries</div>
              </div>
              <div className="content-placeholder">
                <p>Incoming entries will be available soon.</p>
              </div>
            </div>
          )}

          {activeSection === "production" && (
            <div className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div className="panel-title">Production Entries</div>
              </div>
              <div className="content-placeholder">
                <p>Production entries will be available soon.</p>
              </div>
            </div>
          )}

          {activeSection === "dispatch" && (
            <div className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div className="panel-title">Dispatch Entries</div>
              </div>
              <div className="content-placeholder">
                <p>Dispatch entries will be available soon.</p>
              </div>
            </div>
          )}

          {activeSection === "audit" && (
            <div className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div className="panel-title">Audit</div>
              </div>
              <div className="content-placeholder">
                <p>Audit functionality will be available soon.</p>
              </div>
            </div>
          )}

          {activeSection === "admin" && (
            <div className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div className="panel-title">Admin</div>
              </div>
              <div className="content-placeholder">
                <p>Administration tools will be available soon.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .dashboard-sidebar-header {
          padding: 20px;
          border-bottom: 1px solid var(--neutral-700);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .dashboard-logo {
          font-size: 18px;
          font-weight: 700;
          color: white;
        }

        .dashboard-sidebar-footer {
          position: absolute;
          bottom: 0;
          width: 100%;
          border-top: 1px solid var(--neutral-700);
        }

        .button-secondary {
          background-color: var(--accent-1);
          color: white;
          border: none;
          border-radius: 4px;
          padding: 8px 16px;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .button-secondary:hover {
          background-color: #3095e6;
        }

        .search-container {
          position: relative;
        }

        .search-input {
          padding: 8px 12px;
          border: 1px solid var(--neutral-300);
          border-radius: 4px;
          width: 250px;
          font-size: 14px;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--primary);
        }

        .table-container {
          overflow-x: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table th,
        .data-table td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid var(--neutral-200);
        }

        .data-table th {
          font-weight: 600;
          color: var(--neutral-600);
          background-color: var(--neutral-100);
        }

        .data-table tbody tr:hover {
          background-color: var(--neutral-100);
        }

        .action-buttons {
          display: flex;
          gap: 6px;
        }

        .action-button {
          background: none;
          border: none;
          font-size: 14px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .action-button.edit {
          color: var(--accent-1);
        }

        .action-button.delete {
          color: var(--primary);
        }

        .action-button:hover {
          background-color: var(--neutral-200);
        }

        .no-data {
          text-align: center;
          padding: 20px;
          color: var(--neutral-500);
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 20px;
          margin-top: 10px;
        }

        .summary-card {
          background-color: var(--neutral-100);
          border-radius: 6px;
          padding: 16px;
          text-align: center;
        }

        .summary-value {
          font-size: 28px;
          font-weight: 600;
          color: var(--primary);
          margin-bottom: 8px;
        }

        .summary-label {
          font-size: 14px;
          color: var(--neutral-600);
        }

        .content-placeholder {
          padding: 40px 0;
          text-align: center;
          color: var(--neutral-500);
        }
      `}</style>
    </div>
  );
}
