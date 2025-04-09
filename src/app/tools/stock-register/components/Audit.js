import React from "react";

const Audit = ({ userRole }) => {
  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel-header">
        <div className="panel-title">Audit</div>
      </div>

      {userRole === "admin" || userRole === "auditor" ? (
        <div className="audit-content">
          <div className="audit-section">
            <h3>Audit Controls</h3>
            <p>
              Full audit functionality will be available soon for {userRole}s.
            </p>
            <div className="audit-actions">
              <button className="button-secondary">
                Generate Audit Report
              </button>
              <button className="button-secondary">View Audit Logs</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="content-placeholder">
          <p>You don't have permission to access audit functionality.</p>
          <p>Please contact an administrator for access.</p>
        </div>
      )}

      <style jsx>{`
        .audit-content {
          padding: 20px;
        }

        .audit-section {
          margin-bottom: 30px;
        }

        .audit-section h3 {
          margin-bottom: 15px;
          color: var(--neutral-700);
        }

        .audit-actions {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }
      `}</style>
    </div>
  );
};

export default Audit;
