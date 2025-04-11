"use client";

import React, { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  Timestamp,
} from "firebase/firestore";
import app from "../../../../firebase/config";
import { useAppContext } from "../../../../context/AppContext";
import { useNotification } from "../../../../context/NotificationContext";

const db = getFirestore(app);

const Audit = ({ userRole }) => {
  const { companyId } = useAppContext();
  const { showError } = useNotification();

  // Entry type state
  const [activeTab, setActiveTab] = useState("incoming");

  // Date range state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination state
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;

  // Format date for display
  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    const date =
      timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get collection name based on active tab
  const getCollectionName = () => {
    switch (activeTab) {
      case "incoming":
        return "incomingEntries";
      case "production":
        return "productionEntries";
      case "dispatch":
        return "dispatchEntries";
      default:
        return "incomingEntries";
    }
  };

  // Reset pagination when changing tab or date range
  const resetPagination = () => {
    setEntries([]);
    setLastVisible(null);
    setHasMore(true);
  };

  // Fetch entries
  const fetchEntries = async (isFirstPage = false) => {
    if (!companyId || !startDate || !endDate) return;

    setLoading(true);

    try {
      // Convert dates to Firestore timestamps
      const startTimestamp = new Date(startDate);
      startTimestamp.setHours(0, 0, 0, 0);

      const endTimestamp = new Date(endDate);
      endTimestamp.setHours(23, 59, 59, 999);

      // Get reference to the collection
      const companyRef = doc(db, "companies", companyId);
      const entriesCollectionRef = collection(companyRef, getCollectionName());

      // Create query
      let entriesQuery;

      if (isFirstPage) {
        entriesQuery = query(
          entriesCollectionRef,
          where("date", ">=", Timestamp.fromDate(startTimestamp)),
          where("date", "<=", Timestamp.fromDate(endTimestamp)),
          orderBy("date", "desc"),
          limit(PAGE_SIZE)
        );
      } else {
        if (!lastVisible) {
          setLoading(false);
          return;
        }

        entriesQuery = query(
          entriesCollectionRef,
          where("date", ">=", Timestamp.fromDate(startTimestamp)),
          where("date", "<=", Timestamp.fromDate(endTimestamp)),
          orderBy("date", "desc"),
          startAfter(lastVisible),
          limit(PAGE_SIZE)
        );
      }

      // Execute query
      const querySnapshot = await getDocs(entriesQuery);

      // Check if there are no more entries
      if (querySnapshot.empty) {
        setHasMore(false);
        setLoading(false);
        return;
      }

      // Update last visible document for pagination
      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);

      // Map query results to entries array
      const fetchedEntries = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedEntries.push({
          id: doc.id,
          ...data,
          date:
            data.date instanceof Timestamp
              ? data.date.toDate()
              : new Date(data.date),
          createdAt:
            data.createdAt instanceof Timestamp
              ? data.createdAt.toDate()
              : new Date(data.createdAt),
        });
      });

      // Update entries
      setEntries(
        isFirstPage ? fetchedEntries : [...entries, ...fetchedEntries]
      );

      // Check if there are more entries to load
      setHasMore(querySnapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error("Error fetching entries:", error);
      showError("Failed to fetch entries");
    } finally {
      setLoading(false);
    }
  };

  // Handle date range change
  const handleSearch = () => {
    if (!startDate || !endDate) {
      showError("Please select both start and end dates");
      return;
    }

    resetPagination();
    fetchEntries(true);
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    resetPagination();
  };

  // Load more entries
  const loadMore = () => {
    if (!loading && hasMore) {
      fetchEntries(false);
    }
  };

  // Set default date range (current month)
  useEffect(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    setStartDate(firstDayOfMonth.toISOString().split("T")[0]);
    setEndDate(today.toISOString().split("T")[0]);
  }, []);

  // Render entry details based on entry type
  const renderEntryDetails = (entry) => {
    switch (activeTab) {
      case "incoming":
        return (
          <>
            <div className="entry-field">
              <span className="field-label">Product:</span>
              <span className="field-value">
                {entry.product?.commonName ||
                  entry.product?.technicalName ||
                  "N/A"}
              </span>
            </div>
            <div className="entry-field">
              <span className="field-label">Quantity:</span>
              <span className="field-value">
                {entry.quantity}{" "}
                {entry.bagType?.name ? `(${entry.bagType.name})` : ""}
              </span>
            </div>
            <div className="entry-field">
              <span className="field-label">Supplier:</span>
              <span className="field-value">
                {entry.supplier?.name || "N/A"}
              </span>
            </div>
            <div className="entry-field">
              <span className="field-label">Truck No:</span>
              <span className="field-value">{entry.truckNumber || "N/A"}</span>
            </div>
          </>
        );
      case "production":
        return (
          <>
            <div className="entry-field">
              <span className="field-label">Product:</span>
              <span className="field-value">
                {entry.product?.commonName ||
                  entry.product?.technicalName ||
                  "N/A"}
              </span>
            </div>
            <div className="entry-field">
              <span className="field-label">Quantity:</span>
              <span className="field-value">
                {entry.quantity}{" "}
                {entry.bagType?.name ? `(${entry.bagType.name})` : ""}
              </span>
            </div>
            <div className="entry-field">
              <span className="field-label">Machine:</span>
              <span className="field-value">
                {entry.machine?.name || "N/A"}
              </span>
            </div>
          </>
        );
      case "dispatch":
        return (
          <>
            <div className="entry-field">
              <span className="field-label">Product:</span>
              <span className="field-value">
                {entry.product?.commonName ||
                  entry.product?.technicalName ||
                  "N/A"}
              </span>
            </div>
            <div className="entry-field">
              <span className="field-label">Quantity:</span>
              <span className="field-value">
                {entry.quantity}{" "}
                {entry.bagType?.name ? `(${entry.bagType.name})` : ""}
              </span>
            </div>
            <div className="entry-field">
              <span className="field-label">Truck No:</span>
              <span className="field-value">{entry.truckNumber || "N/A"}</span>
            </div>
            <div className="entry-field">
              <span className="field-label">Invoice No:</span>
              <span className="field-value">
                {entry.invoiceNumber || "N/A"}
              </span>
            </div>
          </>
        );
      default:
        return <div>No details available</div>;
    }
  };

  return (
    <div className="dashboard-panel">
      {userRole === "admin" || userRole === "auditor" ? (
        <div className="audit-content">
          {/* Entry Type Tabs */}
          <div className="entry-tabs">
            <div
              className={`tab ${activeTab === "incoming" ? "active" : ""}`}
              onClick={() => handleTabChange("incoming")}
            >
              Incoming Entries
            </div>
            <div
              className={`tab ${activeTab === "production" ? "active" : ""}`}
              onClick={() => handleTabChange("production")}
            >
              Production Entries
            </div>
            <div
              className={`tab ${activeTab === "dispatch" ? "active" : ""}`}
              onClick={() => handleTabChange("dispatch")}
            >
              Dispatch Entries
            </div>
          </div>

          {/* Date Range Selector */}
          <div className="date-range-selector">
            <div className="date-inputs">
              <div className="date-input-group">
                <label htmlFor="start-date">Start Date</label>
                <input
                  type="date"
                  id="start-date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="date-input-group">
                <label htmlFor="end-date">End Date</label>
                <input
                  type="date"
                  id="end-date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <button
              className="button-primary"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? "Loading..." : "Search"}
            </button>
          </div>

          {/* Entries List */}
          <div className="entries-list">
            {entries.length > 0 ? (
              entries.map((entry) => (
                <div key={entry.id} className="entry-card">
                  <div className="entry-header">
                    <div className="entry-date">{formatDate(entry.date)}</div>
                    {entry.potentialDuplicate && (
                      <div className="entry-duplicate-tag">
                        Potential Duplicate
                      </div>
                    )}
                  </div>
                  <div className="entry-body">{renderEntryDetails(entry)}</div>
                  <div className="entry-footer">
                    <div className="entry-created-at">
                      Created: {formatTimestamp(entry.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-entries">
                {loading ? (
                  <div className="loading">Loading entries...</div>
                ) : (
                  <div>No entries found for the selected date range</div>
                )}
              </div>
            )}

            {hasMore && entries.length > 0 && (
              <div className="load-more">
                <button
                  className="button-secondary"
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
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

        .entry-tabs {
          display: flex;
          border-bottom: 1px solid var(--neutral-200);
          margin-bottom: 20px;
        }

        .tab {
          padding: 10px 20px;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s ease;
          position: relative;
          color: var(--neutral-600);
        }

        .tab.active {
          border-bottom: 3px solid var(--primary);
          color: var(--primary-600);
          font-weight: 600;
        }

        .tab:hover {
          color: var(--primary-500);
          background-color: var(--neutral-50);
        }

        .date-range-selector {
          display: flex;
          margin-bottom: 20px;
          align-items: flex-end;
          gap: 15px;
        }

        .date-inputs {
          display: flex;
          gap: 15px;
          flex: 1;
        }

        .date-input-group {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .date-input-group label {
          font-size: 0.9rem;
          margin-bottom: 5px;
          color: var(--neutral-600);
        }

        .date-input-group input {
          padding: 8px 12px;
          border: 1px solid var(--neutral-300);
          border-radius: 4px;
          font-size: 0.9rem;
        }

        .entries-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .entry-card {
          border: 1px solid var(--neutral-200);
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          background-color: white;
        }

        .entry-header {
          padding: 12px 15px;
          background-color: var(--neutral-50);
          border-bottom: 1px solid var(--neutral-200);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .entry-date {
          font-weight: 500;
          color: var(--neutral-800);
        }

        .entry-duplicate-tag {
          background-color: var(--warning-100);
          color: var(--warning-700);
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .entry-body {
          padding: 15px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .entry-field {
          display: flex;
          align-items: center;
        }

        .field-label {
          flex: 1;
          font-weight: 500;
          color: var(--neutral-600);
          max-width: 120px;
        }

        .field-value {
          flex: 2;
          color: var(--neutral-800);
        }

        .entry-footer {
          padding: 10px 15px;
          background-color: var(--neutral-50);
          border-top: 1px solid var(--neutral-200);
          display: flex;
          justify-content: flex-end;
        }

        .entry-created-at {
          font-size: 0.8rem;
          color: var(--neutral-500);
        }

        .no-entries {
          padding: 30px;
          text-align: center;
          color: var(--neutral-600);
          background-color: var(--neutral-50);
          border-radius: 6px;
          border: 1px dashed var(--neutral-300);
        }

        .load-more {
          display: flex;
          justify-content: center;
          margin-top: 20px;
        }

        .loading {
          color: var(--primary-500);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export default Audit;
