"use client";

import React, { useState, useEffect, useRef } from "react";
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
  updateDoc,
  deleteDoc,
  addDoc,
} from "firebase/firestore";
import app from "../../../../firebase/config";
import { useAppContext } from "../../../../context/AppContext";
import { useNotification } from "../../../../context/NotificationContext";

const db = getFirestore(app);

const Audit = ({ userRole }) => {
  const { companyId, products, suppliers, buyers, bagTypes, machines } =
    useAppContext();
  const { showSuccess, showError } = useNotification();

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

  // Edit entry state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete entry state
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);

  // Dropdown refs and state
  const productDropdownRef = useRef(null);
  const supplierDropdownRef = useRef(null);
  const buyerDropdownRef = useRef(null);

  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [supplierSearchTerm, setSupplierSearchTerm] = useState("");
  const [buyerSearchTerm, setBuyerSearchTerm] = useState("");

  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
  const [buyerDropdownOpen, setBuyerDropdownOpen] = useState(false);

  // Edit form fields
  const [editDate, setEditDate] = useState("");
  const [editProduct, setEditProduct] = useState(null);
  const [editQuantity, setEditQuantity] = useState("");
  const [editSupplier, setEditSupplier] = useState(null);
  const [editBuyer, setEditBuyer] = useState(null);
  const [editTruckNumber, setEditTruckNumber] = useState("");
  const [editInvoiceNumber, setEditInvoiceNumber] = useState("");
  const [editMachine, setEditMachine] = useState(null);

  // Filter dropdown options
  const filteredProducts = products.filter(
    (product) =>
      product.technicalName
        ?.toLowerCase()
        .includes(productSearchTerm.toLowerCase()) ||
      product.commonName
        ?.toLowerCase()
        .includes(productSearchTerm.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.name?.toLowerCase().includes(supplierSearchTerm.toLowerCase())
  );

  const filteredBuyers = buyers.filter((buyer) =>
    buyer.name?.toLowerCase().includes(buyerSearchTerm.toLowerCase())
  );

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

  // Handle clicking outside dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        productDropdownRef.current &&
        !productDropdownRef.current.contains(e.target)
      ) {
        setProductDropdownOpen(false);
      }
      if (
        supplierDropdownRef.current &&
        !supplierDropdownRef.current.contains(e.target)
      ) {
        setSupplierDropdownOpen(false);
      }
      if (
        buyerDropdownRef.current &&
        !buyerDropdownRef.current.contains(e.target)
      ) {
        setBuyerDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Open edit modal with entry data
  const handleEditClick = (entry) => {
    setEditEntry(entry);

    // Set form values based on entry type and data
    setEditDate(entry.date.toISOString().split("T")[0]);
    setEditProduct(entry.product || null);
    setEditQuantity(entry.quantity || "");
    setEditSupplier(entry.supplier || null);
    setEditBuyer(entry.buyer || null);
    setEditTruckNumber(entry.truckNumber || "");
    setEditInvoiceNumber(entry.invoiceNumber || "");
    setEditMachine(entry.machine || null);

    setEditModalOpen(true);
  };

  // Close edit modal
  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditEntry(null);
    resetEditForm();
  };

  // Reset edit form fields
  const resetEditForm = () => {
    setEditDate("");
    setEditProduct(null);
    setEditQuantity("");
    setEditSupplier(null);
    setEditBuyer(null);
    setEditTruckNumber("");
    setEditInvoiceNumber("");
    setEditMachine(null);
    setProductSearchTerm("");
    setSupplierSearchTerm("");
    setBuyerSearchTerm("");
  };

  // Save edited entry
  const handleSaveEdit = async () => {
    if (!editEntry || !editDate || !editProduct || !editQuantity) {
      showError("Please fill in all required fields");
      return;
    }

    setIsUpdating(true);

    try {
      const entryData = {
        date: Timestamp.fromDate(new Date(editDate)),
        product: editProduct,
        quantity: parseFloat(editQuantity),
        updatedAt: Timestamp.fromDate(new Date()),
      };

      // Add type-specific fields
      if (activeTab === "incoming") {
        if (!editSupplier || !editTruckNumber) {
          showError("Please fill in all required fields");
          setIsUpdating(false);
          return;
        }
        entryData.supplier = editSupplier;
        entryData.truckNumber = editTruckNumber;
      } else if (activeTab === "production") {
        if (!editMachine) {
          showError("Please select a machine");
          setIsUpdating(false);
          return;
        }
        entryData.machine = editMachine;
      } else if (activeTab === "dispatch") {
        if (!editTruckNumber || !editInvoiceNumber) {
          showError("Please fill in all required fields");
          setIsUpdating(false);
          return;
        }
        // Preserve the existing buyer if it exists in the entry
        if (editEntry.buyer) {
          entryData.buyer = editEntry.buyer;
        }
        entryData.truckNumber = editTruckNumber;
        entryData.invoiceNumber = editInvoiceNumber;
      }

      // Update document in Firestore
      const companyRef = doc(db, "companies", companyId);
      const entryDocRef = doc(companyRef, getCollectionName(), editEntry.id);
      await updateDoc(entryDocRef, entryData);

      // Calculate the quantity difference
      const oldQuantity = parseFloat(editEntry.quantity) || 0;
      const newQuantity = parseFloat(editQuantity) || 0;
      const quantityDiff = newQuantity - oldQuantity;

      // Update product stock based on changes
      const productStockCollectionRef = collection(companyRef, "productStock");

      // CASE 1: Only quantity changed, product remains the same
      if (quantityDiff !== 0 && editProduct.id === editEntry.product.id) {
        // Find the stock record for this product
        const productStockQuery = query(
          productStockCollectionRef,
          where("productId", "==", editProduct.id)
        );

        const querySnapshot = await getDocs(productStockQuery);

        if (!querySnapshot.empty) {
          const stockDoc = querySnapshot.docs[0];
          const stockData = stockDoc.data();
          let newStockQuantity = stockData.availableQuantity || 0;

          // For incoming and production entries, add the difference
          // For dispatch entries, subtract the difference (because dispatch reduces stock)
          if (activeTab === "incoming" || activeTab === "production") {
            newStockQuantity += quantityDiff;
          } else if (activeTab === "dispatch") {
            newStockQuantity -= quantityDiff;
          }

          // Update the stock
          await updateDoc(doc(productStockCollectionRef, stockDoc.id), {
            availableQuantity: newStockQuantity,
            lastUpdated: Timestamp.now(),
          });

          console.log(
            `Updated stock for ${editProduct.technicalName} from ${stockData.availableQuantity} to ${newStockQuantity}`
          );
        }
      }
      // CASE 2: Product changed
      else if (editProduct.id !== editEntry.product.id) {
        // 1. Update old product stock - reverse the original entry's effect
        const oldProductStockQuery = query(
          productStockCollectionRef,
          where("productId", "==", editEntry.product.id)
        );

        const oldProductSnapshot = await getDocs(oldProductStockQuery);

        if (!oldProductSnapshot.empty) {
          const oldStockDoc = oldProductSnapshot.docs[0];
          const oldStockData = oldStockDoc.data();
          let oldStockNewQuantity = oldStockData.availableQuantity || 0;

          // For incoming/production, remove the old quantity; for dispatch, add it back
          if (activeTab === "incoming" || activeTab === "production") {
            oldStockNewQuantity -= oldQuantity;
          } else if (activeTab === "dispatch") {
            oldStockNewQuantity += oldQuantity;
          }

          // Update old product stock
          await updateDoc(doc(productStockCollectionRef, oldStockDoc.id), {
            availableQuantity: oldStockNewQuantity,
            lastUpdated: Timestamp.now(),
          });

          console.log(
            `Updated old product (${editEntry.product.technicalName}) stock to ${oldStockNewQuantity}`
          );
        }

        // 2. Update new product stock - apply the new entry's effect
        const newProductStockQuery = query(
          productStockCollectionRef,
          where("productId", "==", editProduct.id)
        );

        const newProductSnapshot = await getDocs(newProductStockQuery);

        if (newProductSnapshot.empty) {
          // New product doesn't have a stock record yet, create one
          await addDoc(productStockCollectionRef, {
            productId: editProduct.id,
            productName: editProduct.technicalName,
            productCommonName: editProduct.commonName,
            availableQuantity:
              activeTab === "dispatch" ? -newQuantity : newQuantity,
            lastUpdated: Timestamp.now(),
          });

          console.log(
            `Created new stock record for ${editProduct.technicalName} with ${newQuantity} units`
          );
        } else {
          // Update existing stock for new product
          const newStockDoc = newProductSnapshot.docs[0];
          const newStockData = newStockDoc.data();
          let newStockQuantity = newStockData.availableQuantity || 0;

          // For incoming/production, add the new quantity; for dispatch, subtract it
          if (activeTab === "incoming" || activeTab === "production") {
            newStockQuantity += newQuantity;
          } else if (activeTab === "dispatch") {
            newStockQuantity -= newQuantity;
          }

          // Update new product stock
          await updateDoc(doc(productStockCollectionRef, newStockDoc.id), {
            availableQuantity: newStockQuantity,
            lastUpdated: Timestamp.now(),
          });

          console.log(
            `Updated new product (${editProduct.technicalName}) stock to ${newStockQuantity}`
          );
        }
      }

      // Update local entries
      const updatedEntries = entries.map((entry) =>
        entry.id === editEntry.id
          ? {
              ...entry,
              ...entryData,
              date: new Date(editDate),
            }
          : entry
      );
      setEntries(updatedEntries);

      showSuccess("Entry updated successfully");
      handleCloseEditModal();
    } catch (error) {
      console.error("Error updating entry:", error);
      showError("Failed to update entry");
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle delete button click
  const handleDeleteClick = (entry) => {
    setEntryToDelete(entry);
    setDeleteConfirmModalOpen(true);
  };

  // Close delete confirmation modal
  const handleCloseDeleteModal = () => {
    setDeleteConfirmModalOpen(false);
    setEntryToDelete(null);
  };

  // Delete entry
  const handleDeleteEntry = async () => {
    if (!entryToDelete) return;

    setIsDeleting(true);

    try {
      // Delete document from Firestore
      const companyRef = doc(db, "companies", companyId);
      const entryDocRef = doc(
        companyRef,
        getCollectionName(),
        entryToDelete.id
      );
      await deleteDoc(entryDocRef);

      // Update product stock to reflect this deletion
      if (entryToDelete.product && entryToDelete.product.id) {
        const productStockCollectionRef = collection(
          companyRef,
          "productStock"
        );

        // Find the stock record for this product
        const productStockQuery = query(
          productStockCollectionRef,
          where("productId", "==", entryToDelete.product.id)
        );

        const querySnapshot = await getDocs(productStockQuery);

        if (!querySnapshot.empty) {
          const stockDoc = querySnapshot.docs[0];
          const stockData = stockDoc.data();
          let newStockQuantity = stockData.availableQuantity || 0;
          const entryQuantity = parseFloat(entryToDelete.quantity) || 0;

          // For incoming/production, remove the quantity; for dispatch, add it back
          if (activeTab === "incoming" || activeTab === "production") {
            newStockQuantity -= entryQuantity;
          } else if (activeTab === "dispatch") {
            newStockQuantity += entryQuantity;
          }

          // Update the stock
          await updateDoc(doc(productStockCollectionRef, stockDoc.id), {
            availableQuantity: newStockQuantity,
            lastUpdated: Timestamp.now(),
          });

          console.log(
            `Updated stock for ${entryToDelete.product.technicalName} to ${newStockQuantity} after deleting entry`
          );
        }
      }

      // Update local entries
      const updatedEntries = entries.filter(
        (entry) => entry.id !== entryToDelete.id
      );
      setEntries(updatedEntries);

      showSuccess("Entry deleted successfully");
      handleCloseDeleteModal();
    } catch (error) {
      console.error("Error deleting entry:", error);
      showError("Failed to delete entry");
    } finally {
      setIsDeleting(false);
    }
  };

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
              <span className="field-value">{entry.quantity}</span>
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
              <span className="field-value">{entry.quantity}</span>
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
              <span className="field-value">{entry.quantity}</span>
            </div>
            <div className="entry-field">
              <span className="field-label">Buyer:</span>
              <span className="field-value">{entry.buyer?.name || "N/A"}</span>
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
                    <div className="entry-actions">
                      {entry.potentialDuplicate && (
                        <div className="entry-duplicate-tag">
                          Potential Duplicate
                        </div>
                      )}
                      <button
                        className="edit-button"
                        onClick={() => handleEditClick(entry)}
                      >
                        Edit
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => handleDeleteClick(entry)}
                      >
                        Delete
                      </button>
                    </div>
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

          {/* Edit Modal */}
          {editModalOpen && (
            <div className="modal-overlay">
              <div className="edit-modal">
                <div className="modal-header">
                  <h3>
                    Edit{" "}
                    {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}{" "}
                    Entry
                  </h3>
                  <button
                    className="close-button"
                    onClick={handleCloseEditModal}
                  >
                    ×
                  </button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label htmlFor="edit-date">Date</label>
                    <input
                      type="date"
                      id="edit-date"
                      className="premium-input"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Product</label>
                    <div
                      className="dropdown-container"
                      ref={productDropdownRef}
                    >
                      <input
                        type="text"
                        className="premium-input"
                        placeholder="Select product..."
                        value={
                          editProduct
                            ? `${editProduct.technicalName} (${editProduct.commonName})`
                            : productSearchTerm
                        }
                        onChange={(e) => {
                          if (editProduct) setEditProduct(null);
                          setProductSearchTerm(e.target.value);
                          setProductDropdownOpen(true);
                        }}
                        onClick={() => setProductDropdownOpen(true)}
                        required
                      />
                      {productDropdownOpen && (
                        <div className="dropdown-menu">
                          {filteredProducts.length > 0 ? (
                            filteredProducts.map((product) => (
                              <div
                                key={product.id}
                                className="dropdown-item"
                                onClick={() => {
                                  setEditProduct(product);
                                  setProductSearchTerm("");
                                  setProductDropdownOpen(false);
                                }}
                              >
                                <div className="item-name">
                                  {product.technicalName}
                                </div>
                                <div className="item-details">
                                  {product.commonName}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="no-results">No products found</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-quantity">Quantity</label>
                    <input
                      type="number"
                      id="edit-quantity"
                      className="premium-input"
                      placeholder="Enter quantity"
                      value={editQuantity}
                      onChange={(e) => setEditQuantity(e.target.value)}
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </div>

                  {activeTab === "incoming" && (
                    <>
                      <div className="form-group">
                        <label>Supplier</label>
                        <div
                          className="dropdown-container"
                          ref={supplierDropdownRef}
                        >
                          <input
                            type="text"
                            className="premium-input"
                            placeholder="Select supplier..."
                            value={
                              editSupplier
                                ? editSupplier.name
                                : supplierSearchTerm
                            }
                            onChange={(e) => {
                              if (editSupplier) setEditSupplier(null);
                              setSupplierSearchTerm(e.target.value);
                              setSupplierDropdownOpen(true);
                            }}
                            onClick={() => setSupplierDropdownOpen(true)}
                            required
                          />
                          {supplierDropdownOpen && (
                            <div className="dropdown-menu">
                              {filteredSuppliers.length > 0 ? (
                                filteredSuppliers.map((supplier) => (
                                  <div
                                    key={supplier.id}
                                    className="dropdown-item"
                                    onClick={() => {
                                      setEditSupplier(supplier);
                                      setSupplierSearchTerm("");
                                      setSupplierDropdownOpen(false);
                                    }}
                                  >
                                    <div className="item-name">
                                      {supplier.name}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="no-results">
                                  No suppliers found
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="form-group">
                        <label htmlFor="edit-truck-number">Truck Number</label>
                        <input
                          type="text"
                          id="edit-truck-number"
                          className="premium-input"
                          placeholder="Enter truck number"
                          value={editTruckNumber}
                          onChange={(e) => setEditTruckNumber(e.target.value)}
                          required
                        />
                      </div>
                    </>
                  )}

                  {activeTab === "production" && (
                    <div className="form-group">
                      <label>Machine</label>
                      <select
                        className="premium-input"
                        value={editMachine?.id || ""}
                        onChange={(e) => {
                          const selectedMachine = machines.find(
                            (machine) => machine.id === e.target.value
                          );
                          setEditMachine(selectedMachine || null);
                        }}
                        required
                      >
                        <option value="">Select machine...</option>
                        {machines.map((machine) => (
                          <option key={machine.id} value={machine.id}>
                            {machine.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {activeTab === "dispatch" && (
                    <>
                      <div className="form-group">
                        <label htmlFor="edit-truck-number">Truck Number</label>
                        <input
                          type="text"
                          id="edit-truck-number"
                          className="premium-input"
                          placeholder="Enter truck number"
                          value={editTruckNumber}
                          onChange={(e) => setEditTruckNumber(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="edit-invoice-number">
                          Invoice Number
                        </label>
                        <input
                          type="text"
                          id="edit-invoice-number"
                          className="premium-input"
                          placeholder="Enter invoice number"
                          value={editInvoiceNumber}
                          onChange={(e) => setEditInvoiceNumber(e.target.value)}
                          required
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    className="button-secondary"
                    onClick={handleCloseEditModal}
                    disabled={isUpdating}
                  >
                    Cancel
                  </button>
                  <button
                    className="button-primary"
                    onClick={handleSaveEdit}
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirmModalOpen && (
            <div className="modal-overlay">
              <div className="delete-modal">
                <div className="modal-header">
                  <h3>Confirm Deletion</h3>
                  <button
                    className="close-button"
                    onClick={handleCloseDeleteModal}
                  >
                    ×
                  </button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to delete this entry?</p>
                </div>
                <div className="modal-footer">
                  <button
                    className="button-secondary"
                    onClick={handleCloseDeleteModal}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    style={{
                      backgroundColor: "red",
                    }}
                    onClick={handleDeleteEntry}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          )}
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

        .entry-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .entry-duplicate-tag {
          background-color: var(--warning-100);
          color: var(--warning-700);
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .edit-button {
          background-color: var(--primary-50);
          color: var(--primary-600);
          border: 1px solid var(--primary-200);
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .edit-button:hover {
          background-color: var(--primary-100);
        }

        .delete-button {
          background-color: var(--error-50);
          color: var(--error-600);
          border: 1px solid var(--error-200);
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .delete-button:hover {
          background-color: var(--error-100);
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

        /* Modal styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .edit-modal {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1),
            0 1px 3px rgba(0, 0, 0, 0.08);
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .delete-modal {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1),
            0 1px 3px rgba(0, 0, 0, 0.08);
          width: 90%;
          max-width: 400px;
        }

        .modal-header {
          padding: 15px 20px;
          border-bottom: 1px solid var(--neutral-200);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(
            to right,
            var(--primary),
            var(--primary-light, #ff6b6b)
          );
          color: white;
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.2rem;
        }

        .delete-modal .modal-header {
          background: linear-gradient(
            to right,
            var(--error-600),
            var(--error-500)
          );
        }

        .delete-modal .modal-body {
          text-align: center;
          padding: 25px 20px;
        }

        .delete-modal .modal-body p {
          font-size: 1.1rem;
          margin: 0;
        }

        .delete-modal .button-primary {
          background-color: var(--error-600);
        }

        .delete-modal .button-primary:hover {
          background-color: var(--error-700);
        }

        .close-button {
          background: none;
          border: none;
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }

        .modal-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .modal-footer {
          padding: 15px 20px;
          border-top: 1px solid var(--neutral-200);
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--neutral-700);
        }

        .premium-input {
          padding: 10px 12px;
          border: 1px solid var(--neutral-300);
          border-radius: 6px;
          font-size: 0.95rem;
          transition: all 0.2s ease;
          background-color: white;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .premium-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.15);
          outline: none;
        }

        .premium-input::placeholder {
          color: var(--neutral-400);
        }

        /* Dropdown styles */
        .dropdown-container {
          position: relative;
        }

        .dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          width: 100%;
          background-color: white;
          border: 1px solid var(--neutral-300);
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          max-height: 200px;
          overflow-y: auto;
          z-index: 10;
        }

        .dropdown-item {
          padding: 8px 12px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .dropdown-item:hover {
          background-color: var(--neutral-100);
        }

        .item-name {
          font-weight: 500;
          color: var(--neutral-800);
        }

        .item-details {
          font-size: 0.8rem;
          color: var(--neutral-600);
        }

        .no-results {
          padding: 10px;
          color: var(--neutral-500);
          text-align: center;
          font-size: 0.9rem;
        }

        .button-primary {
          background-color: var(--primary);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .button-primary:hover {
          background-color: var(--primary-dark);
        }

        .button-primary:disabled {
          background-color: var(--neutral-300);
          cursor: not-allowed;
        }

        .button-secondary {
          background-color: white;
          color: var(--neutral-700);
          border: 1px solid var(--neutral-300);
          padding: 8px 16px;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .button-secondary:hover {
          background-color: var(--neutral-100);
          border-color: var(--neutral-400);
        }

        .button-secondary:disabled {
          color: var(--neutral-400);
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default Audit;
