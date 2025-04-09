import React from "react";

const Sidebar = ({
  activeSection,
  setActiveSection,
  handleLogout,
  userRole,
  companyId,
}) => {
  return (
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
          className={`menu-item ${activeSection === "summary" ? "active" : ""}`}
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

        {userRole === "admin" && (
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
        )}
      </div>

      <div className="dashboard-sidebar-footer">
        <div className="dashboard-user-info">
          {
            // <div className="user-role">
            //   Role: <span>{userRole}</span>
            //   <br />
            //   CompanyId: <span>{companyId}</span>
            // </div>
          }
        </div>
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
  );
};

export default Sidebar;
