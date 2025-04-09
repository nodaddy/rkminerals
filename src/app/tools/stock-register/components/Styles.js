import React from "react";

const Styles = () => {
  return (
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

      .dashboard-user-info {
        padding: 12px 20px;
        border-bottom: 1px solid var(--neutral-700);
        color: var(--neutral-300);
        font-size: 14px;
      }

      .user-role {
        display: flex;
        justify-content: space-between;
      }

      .user-role span {
        color: white;
        font-weight: 500;
        text-transform: capitalize;
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
  );
};

export default Styles;
