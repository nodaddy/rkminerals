import React from "react";

const Inventory = ({
  stockItems,
  searchTerm,
  setSearchTerm,
  setSelectedItem,
  setIsAddModalOpen,
  userRole,
}) => {
  // Filter stock items based on search term
  const filteredItems = stockItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if user has edit permissions
  const canEdit = userRole === "admin" || userRole === "manager";

  return (
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
                {canEdit && <th>Actions</th>}
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
                    {canEdit && (
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-button edit"
                            onClick={() => setSelectedItem(item)}
                          >
                            Edit
                          </button>
                          {userRole === "admin" && (
                            <button className="action-button delete">
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={canEdit ? "5" : "4"} className="no-data">
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
  );
};

export default Inventory;
