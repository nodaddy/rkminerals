import React from "react";
import AppIcons from "../../../../components/AppIcons";

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
            <AppIcons.Dashboard size={20} />
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
            <AppIcons.Download size={20} />
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
            <AppIcons.Tool size={20} />
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
            <AppIcons.Truck size={20} />
          </span>
          Dispatch Entries
        </div>

        <div
          className={`menu-item ${activeSection === "audit" ? "active" : ""}`}
          onClick={() => setActiveSection("audit")}
        >
          <span className="menu-item-icon">
            <AppIcons.Activity size={20} />
          </span>
          Audit
        </div>

        {userRole === "admin" && (
          <div
            className={`menu-item ${activeSection === "admin" ? "active" : ""}`}
            onClick={() => setActiveSection("admin")}
          >
            <span className="menu-item-icon">
              <AppIcons.Settings size={20} />
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
            <AppIcons.Logout size={20} />
          </span>
          Logout
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
