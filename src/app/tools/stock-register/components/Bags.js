"use client";

import { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import app from "@/firebase/config";
import AppIcons from "@/components/AppIcons";

const db = getFirestore(app);

const Bags = () => {
  const { bagTypes, companyId } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [bagsData, setBagsData] = useState([]);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State for editing bag quantity
  const [editingBag, setEditingBag] = useState(null);
  const [newQuantity, setNewQuantity] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState({ type: "", text: "" });

  // Fetch bag stock data
  const fetchBagStock = async () => {
    if (!companyId || !bagTypes.length) return;

    setLoading(true);
    setError(null);

    try {
      const companyRef = doc(db, "companies", companyId);
      const bagStockCollectionRef = collection(companyRef, "bagStock");
      const querySnapshot = await getDocs(bagStockCollectionRef);

      // Create a map of bag stocks
      const stockMap = {};
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        stockMap[data.bagTypeId] = {
          id: doc.id,
          availableQuantity: data.availableQuantity || 0,
          lastUpdated: data.lastUpdated?.toDate() || new Date(),
        };
      });

      // Combine bagTypes with their stock data
      const combinedData = bagTypes.map((bagType) => ({
        ...bagType,
        stock: stockMap[bagType.id] || {
          availableQuantity: 0,
          lastUpdated: new Date(),
        },
      }));

      setBagsData(combinedData);
    } catch (err) {
      console.error("Error fetching bag stock:", err);
      setError("Failed to load bag stock data");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch data when component mounts or when bagTypes/companyId changes
  useEffect(() => {
    fetchBagStock();
  }, [bagTypes, companyId]);

  // Refresh data
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchBagStock();
  };

  // Start editing a bag quantity
  const handleEditClick = (bag) => {
    setEditingBag(bag);
    setNewQuantity(String(bag.stock.availableQuantity));
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingBag(null);
    setNewQuantity("");
    setUpdateMessage({ type: "", text: "" });
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Save new quantity
  const handleSaveQuantity = async () => {
    if (!editingBag) return;

    // Validate input
    const parsedQuantity = parseInt(newQuantity, 10);
    if (isNaN(parsedQuantity) || parsedQuantity < 0) {
      setUpdateMessage({
        type: "error",
        text: "Please enter a valid quantity (0 or greater)",
      });
      return;
    }

    setIsUpdating(true);
    setUpdateMessage({ type: "", text: "" });

    try {
      const companyRef = doc(db, "companies", companyId);
      const bagStockCollectionRef = collection(companyRef, "bagStock");

      // Check if a stock record exists for this bag type
      const bagStockQuery = query(
        bagStockCollectionRef,
        where("bagTypeId", "==", editingBag.id)
      );

      const querySnapshot = await getDocs(bagStockQuery);

      if (querySnapshot.empty) {
        // No existing record, create a new one
        await addDoc(bagStockCollectionRef, {
          bagTypeId: editingBag.id,
          bagTypeName: editingBag.name,
          capacity: editingBag.capacity,
          availableQuantity: parsedQuantity,
          lastUpdated: Timestamp.now(),
        });
      } else {
        // Update existing record
        const stockDoc = querySnapshot.docs[0];
        await updateDoc(doc(bagStockCollectionRef, stockDoc.id), {
          availableQuantity: parsedQuantity,
          lastUpdated: Timestamp.now(),
        });
      }

      // Update local state
      const updatedBagsData = bagsData.map((bag) => {
        if (bag.id === editingBag.id) {
          return {
            ...bag,
            stock: {
              ...bag.stock,
              availableQuantity: parsedQuantity,
              lastUpdated: new Date(),
            },
          };
        }
        return bag;
      });

      setBagsData(updatedBagsData);

      setUpdateMessage({
        type: "success",
        text: "Bag quantity updated successfully",
      });

      // Reset editing state after a short delay
      setTimeout(() => {
        setEditingBag(null);
        setNewQuantity("");
        setUpdateMessage({ type: "", text: "" });
      }, 2000);
    } catch (err) {
      console.error("Error updating bag quantity:", err);
      setUpdateMessage({
        type: "error",
        text: err.message || "Failed to update quantity",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="dashboard-panel">
      <div className="panel-content">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <span>Loading bag inventory...</span>
          </div>
        ) : error ? (
          <div className="error-state">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="error-icon"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        ) : bagsData.length === 0 ? (
          <div className="empty-state">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="empty-icon"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                clipRule="evenodd"
              />
            </svg>
            <span>No bag types available</span>
          </div>
        ) : (
          <div className="stock-table-container">
            {updateMessage.text && (
              <div className={`update-message ${updateMessage.type}`}>
                {updateMessage.text}
              </div>
            )}
            <table className="stock-table">
              <thead>
                <tr>
                  <th>Bag Name</th>
                  <th>Capacity (MT)</th>
                  <th>Available Quantity</th>
                  <th>Last Updated</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bagsData.map((bag) => (
                  <tr key={bag.id}>
                    <td>{bag.name || "—"}</td>
                    <td>{bag.capacity || "—"}</td>
                    <td className="quantity-cell">
                      {editingBag && editingBag.id === bag.id ? (
                        <div className="quantity-edit">
                          <input
                            type="number"
                            min="0"
                            value={newQuantity}
                            onChange={(e) => setNewQuantity(e.target.value)}
                            className="quantity-input"
                            autoFocus
                          />
                          <div className="edit-actions">
                            <button
                              className="save-btn"
                              onClick={handleSaveQuantity}
                              disabled={isUpdating}
                            >
                              {isUpdating ? (
                                <span className="spinner-sm"></span>
                              ) : (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                  width="16"
                                  height="16"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </button>
                            <button
                              className="cancel-btn"
                              onClick={handleCancelEdit}
                              disabled={isUpdating}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                width="16"
                                height="16"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="quantity-display">
                          <span>{bag.stock.availableQuantity}</span>
                          <button
                            className="edit-btn"
                            onClick={() => handleEditClick(bag)}
                            title="Edit quantity"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              width="16"
                              height="16"
                            >
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>
                    <td>{formatDate(bag.stock.lastUpdated)}</td>
                    <td>
                      <div
                        className={`stock-status ${
                          bag.stock.availableQuantity <= 0
                            ? "out-of-stock"
                            : bag.stock.availableQuantity < 5
                            ? "low-stock"
                            : "in-stock"
                        }`}
                      >
                        {bag.stock.availableQuantity <= 0
                          ? "Out of Stock"
                          : bag.stock.availableQuantity < 5
                          ? "Low Stock"
                          : "In Stock"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .dashboard-panel {
          background-color: white;
          border-radius: 0.5rem;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1),
            0 1px 2px 0 rgba(0, 0, 0, 0.06);
          overflow: hidden;
          margin-bottom: 1.5rem;
        }

        .dashboard-panel-header {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .panel-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .refresh-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #4f46e5;
          background-color: #eff6ff;
          border: 1px solid #dbeafe;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-button:hover:not(:disabled) {
          background-color: #dbeafe;
        }

        .refresh-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .refresh-icon {
          width: 1rem;
          height: 1rem;
        }

        .spinning {
          animation: spin 1.5s linear infinite;
        }

        .panel-content {
          padding: 1.5rem;
        }

        /* Stock Table Styles */
        .stock-table-container {
          margin-top: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          overflow: hidden;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }

        .stock-table {
          width: 100%;
          border-collapse: collapse;
        }

        .stock-table th {
          background-color: #f9fafb;
          text-align: left;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #4b5563;
          border-bottom: 1px solid #e5e7eb;
        }

        .stock-table td {
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
          color: #1f2937;
          font-size: 0.875rem;
        }

        .stock-table tr:last-child td {
          border-bottom: none;
        }

        .update-message {
          margin-bottom: 1rem;
          padding: 0.75rem 1rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .update-message.success {
          background-color: #d1fae5;
          color: #065f46;
        }

        .update-message.error {
          background-color: #fee2e2;
          color: #b91c1c;
        }

        /* Status Styles */
        .stock-status {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
          text-align: center;
          white-space: nowrap;
        }

        .in-stock {
          background-color: #d1fae5;
          color: #065f46;
        }

        .low-stock {
          background-color: #fef3c7;
          color: #92400e;
        }

        .out-of-stock {
          background-color: #fee2e2;
          color: #b91c1c;
        }

        /* Quantity Edit Styles */
        .quantity-cell {
          font-weight: 600;
        }

        .quantity-display {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .edit-btn {
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .edit-btn:hover {
          color: #4f46e5;
          background-color: #eff6ff;
        }

        .quantity-edit {
          display: flex;
          flex-direction: row;
          gap: 0.5rem;
          align-items: center;
        }

        .quantity-input {
          padding: 0.375rem 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.25rem;
          font-size: 0.875rem;
          width: 5rem;
        }

        .quantity-input:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .edit-actions {
          display: flex;
          gap: 0.25rem;
        }

        .save-btn,
        .cancel-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          cursor: pointer;
          width: 24px;
          height: 24px;
          border-radius: 4px;
          padding: 0;
          transition: all 0.2s;
        }

        .save-btn {
          color: #065f46;
        }

        .save-btn:hover:not(:disabled) {
          background-color: #d1fae5;
        }

        .save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .cancel-btn {
          color: #b91c1c;
        }

        .cancel-btn:hover:not(:disabled) {
          background-color: #fee2e2;
        }

        .cancel-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinner-sm {
          display: inline-block;
          width: 1rem;
          height: 1rem;
          border: 2px solid rgba(79, 70, 229, 0.2);
          border-top-color: #4f46e5;
          border-radius: 50%;
          animation: spin 1s infinite linear;
        }

        /* Loading/Empty States */
        .loading-state,
        .error-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 0;
          text-align: center;
          color: #6b7280;
        }

        .loading-spinner {
          width: 2.5rem;
          height: 2.5rem;
          border: 3px solid rgba(0, 0, 0, 0.1);
          border-top-color: #4f46e5;
          border-radius: 50%;
          animation: spin 1s infinite linear;
          margin-bottom: 1rem;
        }

        .error-icon,
        .empty-icon {
          width: 2.5rem;
          height: 2.5rem;
          color: #ef4444;
          margin-bottom: 1rem;
        }

        .empty-icon {
          color: #6b7280;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default Bags;
