"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAppContext } from "../../../../context/AppContext";
import { useNotification } from "../../../../context/NotificationContext";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import app from "../../../../firebase/config";

const db = getFirestore(app);

const ProductionEntries = () => {
  const { products, machines, bagTypes, entitiesLoading, companyId } =
    useAppContext();
  const { showSuccess, showError } = useNotification();

  // Form state
  const [date, setDate] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [selectedBagType, setSelectedBagType] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Duplicate entry detection state
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [potentialDuplicate, setPotentialDuplicate] = useState(null);

  // Recent entries state
  const [recentEntries, setRecentEntries] = useState([]);
  const [fetchingEntries, setFetchingEntries] = useState(false);

  // Dropdown search state
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [machineSearchTerm, setMachineSearchTerm] = useState("");
  const [bagTypeSearchTerm, setBagTypeSearchTerm] = useState("");

  // Dropdown visibility state
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [machineDropdownOpen, setMachineDropdownOpen] = useState(false);
  const [bagTypeDropdownOpen, setBagTypeDropdownOpen] = useState(false);

  // Refs for dropdown click outside handling
  const productDropdownRef = useRef(null);
  const machineDropdownRef = useRef(null);
  const bagTypeDropdownRef = useRef(null);

  // Filter products based on search term
  const filteredProducts = products.filter(
    (product) =>
      product.technicalName
        ?.toLowerCase()
        .includes(productSearchTerm.toLowerCase()) ||
      product.commonName
        ?.toLowerCase()
        .includes(productSearchTerm.toLowerCase())
  );

  // Filter machines based on search term
  const filteredMachines = machines.filter((machine) =>
    machine.name?.toLowerCase().includes(machineSearchTerm.toLowerCase())
  );

  // Filter bag types based on search term and add client bag option
  const filteredBagTypes = [
    ...bagTypes.filter((bagType) =>
      bagType.name?.toLowerCase().includes(bagTypeSearchTerm.toLowerCase())
    ),
  ];

  // Fetch entries for selected date
  const fetchEntriesByDate = async (selectedDate) => {
    if (!selectedDate || !companyId) return;

    setFetchingEntries(true);
    try {
      // Convert selected date to start and end timestamps (12:00 AM to 11:59 PM)
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

      // Query entries for the selected date
      const companyRef = doc(db, "companies", companyId);
      const entriesCollectionRef = collection(companyRef, "productionEntries");
      const entriesQuery = query(
        entriesCollectionRef,
        where("date", ">=", Timestamp.fromDate(startDate)),
        where("date", "<=", Timestamp.fromDate(endDate)),
        orderBy("date", "desc")
      );

      const querySnapshot = await getDocs(entriesQuery);

      // Map query results to entries array
      const fetchedEntries = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedEntries.push({
          id: doc.id,
          ...data,
          date: data.date.toDate(),
          createdAt: data.createdAt.toDate(),
        });
      });

      setRecentEntries(fetchedEntries);
    } catch (error) {
      console.error("Error fetching entries:", error);
      showError("Failed to fetch entries for the selected date");
    } finally {
      setFetchingEntries(false);
    }
  };

  // Update recent entries when date changes
  useEffect(() => {
    if (date) {
      fetchEntriesByDate(date);
    } else {
      setRecentEntries([]);
    }
  }, [date, companyId]);

  // Check for duplicate entries
  const checkForDuplicates = (newEntry) => {
    // Check if there's an entry with the same date, product, machine and quantity
    return recentEntries.find(
      (entry) =>
        entry.product.id === newEntry.product.id &&
        entry.machine.id === newEntry.machine.id &&
        Math.abs(entry.quantity - newEntry.quantity) < 0.001 // Using small epsilon for float comparison
    );
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return "";

    if (typeof date === "string") {
      date = new Date(date);
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format time only for display
  const formatTime = (date) => {
    if (!date) return "";

    if (typeof date === "string") {
      date = new Date(date);
    }

    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!date) {
      showError("Please select a date");
      return;
    }

    if (!selectedProduct) {
      showError("Please select a product");
      return;
    }

    if (!quantity || isNaN(parseFloat(quantity)) || parseFloat(quantity) <= 0) {
      showError("Please enter a valid quantity");
      return;
    }

    if (!selectedMachine) {
      showError("Please select a machine");
      return;
    }

    if (!selectedBagType) {
      showError("Please select a bag type");
      return;
    }

    // Prepare the entry data
    const entryData = {
      date: Timestamp.fromDate(new Date(date)),
      product: {
        id: selectedProduct.id,
        technicalName: selectedProduct.technicalName,
        commonName: selectedProduct.commonName,
      },
      quantity: parseFloat(quantity),
      machine: {
        id: selectedMachine.id,
        name: selectedMachine.name,
      },
      bagType: {
        id: selectedBagType.id,
        name: selectedBagType.name,
        capacity: selectedBagType.capacity || null,
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    // Check for duplicates if not already confirmed
    const duplicateEntry = checkForDuplicates(entryData);
    if (duplicateEntry && !potentialDuplicate) {
      setPotentialDuplicate(entryData);
      setShowDuplicateWarning(true);
      return;
    }

    setIsSubmitting(true);

    try {
      // If this is a confirmed duplicate, add the flag
      if (potentialDuplicate) {
        entryData.potentialDuplicate = true;
        // Reset the potential duplicate state
        setPotentialDuplicate(null);
      }

      // Get a reference to the Firestore database
      const companyRef = doc(db, "companies", companyId);

      // 1. Save the production entry
      const entriesCollectionRef = collection(companyRef, "productionEntries");
      await addDoc(entriesCollectionRef, entryData);

      // 2. Update product stock
      const productStockCollectionRef = collection(companyRef, "productStock");

      // Check if stock record already exists for this product
      const productStockQuery = query(
        productStockCollectionRef,
        where("productId", "==", selectedProduct.id)
      );

      const querySnapshot = await getDocs(productStockQuery);

      // Transaction to ensure consistent stock updates
      if (querySnapshot.empty) {
        // Product stock doesn't exist yet - create new document
        await addDoc(productStockCollectionRef, {
          productId: selectedProduct.id,
          productName: selectedProduct.technicalName,
          productCommonName: selectedProduct.commonName,
          availableQuantity: parseFloat(quantity),
          lastUpdated: Timestamp.now(),
        });
        console.log(
          `Created new stock record for ${selectedProduct.technicalName} with ${quantity} units`
        );
      } else {
        // Product stock exists - update the existing document
        const stockDoc = querySnapshot.docs[0];
        const stockData = stockDoc.data();

        // Update available quantity
        await updateDoc(doc(productStockCollectionRef, stockDoc.id), {
          availableQuantity:
            (stockData.availableQuantity || 0) + parseFloat(quantity),
          lastUpdated: Timestamp.now(),
        });
        console.log(
          `Updated stock for ${selectedProduct.technicalName} to ${
            (stockData.availableQuantity || 0) + parseFloat(quantity)
          } units`
        );
      }

      showSuccess("Production entry added successfully!");

      // Reset form fields except date
      setSelectedProduct(null);
      setQuantity("");
      setSelectedMachine(null);
      setSelectedBagType(null);
      setProductSearchTerm("");
      setMachineSearchTerm("");
      setBagTypeSearchTerm("");
      setShowDuplicateWarning(false);

      // Refresh entries list for the current date
      fetchEntriesByDate(date);
    } catch (error) {
      console.error("Error adding entry:", error);
      showError("Failed to add entry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle duplicate confirmation
  const confirmDuplicate = () => {
    setShowDuplicateWarning(false);
    handleSubmit({ preventDefault: () => {} });
  };

  // Handle duplicate cancellation
  const cancelDuplicate = () => {
    setShowDuplicateWarning(false);
    setPotentialDuplicate(null);
  };

  // Handle click outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        productDropdownRef.current &&
        !productDropdownRef.current.contains(event.target)
      ) {
        setProductDropdownOpen(false);
      }

      if (
        machineDropdownRef.current &&
        !machineDropdownRef.current.contains(event.target)
      ) {
        setMachineDropdownOpen(false);
      }

      if (
        bagTypeDropdownRef.current &&
        !bagTypeDropdownRef.current.contains(event.target)
      ) {
        setBagTypeDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel-header">
        <div className="date-selector">
          <label htmlFor="date">
            Date: <span className="required">*</span>
          </label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`date-input ${!date ? "input-required" : ""}`}
            required
          />
        </div>
      </div>

      {entitiesLoading ? (
        <div className="content-loading">
          <div className="loading-spinner"></div>
          <p>Loading data...</p>
        </div>
      ) : (
        <div className="entries-container">
          <div
            className="entries-table-container"
            style={{ minHeight: "400px" }}
          >
            <table className="entries-table">
              <thead>
                <tr>
                  <th style={{ width: "5%" }}>SN</th>
                  <th style={{ width: "25%" }}>
                    Product <span className="required">*</span>
                  </th>
                  <th style={{ width: "10%" }}>
                    Qty (MT) <span className="required">*</span>
                  </th>
                  <th style={{ width: "20%" }}>
                    Machine <span className="required">*</span>
                  </th>
                  <th style={{ width: "20%" }}>
                    Bag Type <span className="required">*</span>
                  </th>
                  <th style={{ width: "5%" }}></th>
                </tr>
              </thead>
              <tbody>
                {/* Form row */}
                <tr className="form-row">
                  <td></td>
                  <td>
                    <div className="cell-input" ref={productDropdownRef}>
                      <div className="searchable-dropdown">
                        <input
                          type="text"
                          placeholder="Select product..."
                          value={
                            selectedProduct
                              ? `${selectedProduct.technicalName} (${selectedProduct.commonName})`
                              : productSearchTerm
                          }
                          onChange={(e) => {
                            if (selectedProduct) {
                              setSelectedProduct(null);
                            }
                            setProductSearchTerm(e.target.value);
                            setProductDropdownOpen(true);
                          }}
                          onClick={() => setProductDropdownOpen(true)}
                          readOnly={isSubmitting}
                          className={`form-control ${
                            !selectedProduct ? "input-required" : ""
                          }`}
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
                                    setSelectedProduct(product);
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
                              <div className="no-results">
                                No products found
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="cell-input">
                      <input
                        type="number"
                        placeholder="Qty"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        min="0.01"
                        step="0.01"
                        disabled={isSubmitting}
                        className={`form-control ${
                          !quantity ? "input-required" : ""
                        }`}
                        required
                      />
                    </div>
                  </td>
                  <td>
                    <div className="cell-input" ref={machineDropdownRef}>
                      <div className="searchable-dropdown">
                        <input
                          type="text"
                          placeholder="Select machine..."
                          value={
                            selectedMachine
                              ? selectedMachine.name
                              : machineSearchTerm
                          }
                          onChange={(e) => {
                            if (selectedMachine) {
                              setSelectedMachine(null);
                            }
                            setMachineSearchTerm(e.target.value);
                            setMachineDropdownOpen(true);
                          }}
                          onClick={() => setMachineDropdownOpen(true)}
                          readOnly={isSubmitting}
                          className={`form-control ${
                            !selectedMachine ? "input-required" : ""
                          }`}
                          required
                        />
                        {machineDropdownOpen && (
                          <div className="dropdown-menu">
                            {filteredMachines.length > 0 ? (
                              filteredMachines.map((machine) => (
                                <div
                                  key={machine.id}
                                  className="dropdown-item"
                                  onClick={() => {
                                    setSelectedMachine(machine);
                                    setMachineSearchTerm("");
                                    setMachineDropdownOpen(false);
                                  }}
                                >
                                  <div className="item-name">
                                    {machine.name}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="no-results">
                                No machines found
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="cell-input" ref={bagTypeDropdownRef}>
                      <div className="searchable-dropdown">
                        <input
                          type="text"
                          placeholder="Select bag type..."
                          value={
                            selectedBagType
                              ? `${selectedBagType.name}${
                                  selectedBagType.capacity
                                    ? ` (${selectedBagType.capacity} MT)`
                                    : ""
                                }`
                              : bagTypeSearchTerm
                          }
                          onChange={(e) => {
                            if (selectedBagType) {
                              setSelectedBagType(null);
                            }
                            setBagTypeSearchTerm(e.target.value);
                            setBagTypeDropdownOpen(true);
                          }}
                          onClick={() => setBagTypeDropdownOpen(true)}
                          readOnly={isSubmitting}
                          className={`form-control ${
                            !selectedBagType ? "input-required" : ""
                          }`}
                          required
                        />
                        {bagTypeDropdownOpen && (
                          <div className="dropdown-menu">
                            {filteredBagTypes.length > 0 ? (
                              filteredBagTypes.map((bagType) => (
                                <div
                                  key={bagType.id}
                                  className="dropdown-item"
                                  onClick={() => {
                                    setSelectedBagType(bagType);
                                    setBagTypeSearchTerm("");
                                    setBagTypeDropdownOpen(false);
                                  }}
                                >
                                  <div className="item-name">
                                    {bagType.name}
                                  </div>
                                  {bagType.capacity && (
                                    <div className="item-details">
                                      {bagType.capacity} MT
                                    </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="no-results">
                                No bag types found
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="add-button"
                      disabled={isSubmitting}
                      onClick={handleSubmit}
                    >
                      {isSubmitting ? (
                        <span className="loading-spinner-small"></span>
                      ) : (
                        <b>Add</b>
                      )}
                    </button>
                  </td>
                </tr>

                {/* Separator */}
                <tr className="separator-row">
                  <td colSpan="6"></td>
                </tr>

                {/* Data rows */}
                {!date ? (
                  <tr>
                    <td colSpan="6" className="empty-cell">
                      Please select a date to view entries
                    </td>
                  </tr>
                ) : fetchingEntries ? (
                  <tr>
                    <td colSpan="6" className="loading-cell">
                      <div className="loading-spinner-small"></div>
                      <span>Loading entries...</span>
                    </td>
                  </tr>
                ) : recentEntries.length > 0 ? (
                  recentEntries.map((entry, index) => (
                    <tr key={entry.id} className="data-row">
                      <td>{index + 1}</td>
                      <td>
                        <div className="cell-content">
                          <div
                            className="primary-text"
                            style={{ position: "relative" }}
                          >
                            {entry.potentialDuplicate && (
                              <span style={{ color: "#d32f2f" }}>#&nbsp;</span>
                            )}
                            {entry.product.technicalName} (
                            {entry.product.commonName})
                          </div>
                        </div>
                      </td>
                      <td>{entry.quantity.toFixed(2)}</td>
                      <td>{entry.machine.name}</td>
                      <td>{entry.bagType.name}</td>
                      <td></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="empty-cell">
                      No entries found for{" "}
                      {new Date(date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showDuplicateWarning && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>
                <span style={{ color: "#d32f2f" }}>#</span> Potential Duplicate
                Entry
              </h3>
            </div>
            <div className="modal-body">
              <p>
                This appears to be a duplicate entry for the same product,
                machine, and quantity on this date. Do you still want to add
                this entry?
              </p>
              <div className="duplicate-details">
                <div>
                  <strong>Date:</strong> {new Date(date).toLocaleDateString()}
                </div>
                <div>
                  <strong>Product:</strong>{" "}
                  {potentialDuplicate?.product?.technicalName} (
                  {potentialDuplicate?.product?.commonName})
                </div>
                <div>
                  <strong>Quantity:</strong> {potentialDuplicate?.quantity} MT
                </div>
                <div>
                  <strong>Machine:</strong> {potentialDuplicate?.machine?.name}
                </div>
                <div>
                  <strong>Bag Type:</strong> {potentialDuplicate?.bagType?.name}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="cancel-button"
                onClick={cancelDuplicate}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className="confirm-button"
                onClick={confirmDuplicate}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading-spinner-small"></span>
                    <span>Adding...</span>
                  </>
                ) : (
                  "Proceed Anyway"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .dashboard-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 5px;
          border-bottom: 1px solid #e5e5e5;
        }

        .date-selector {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .date-selector label {
          font-weight: 500;
          color: #555;
        }

        .date-input {
          padding: 6px 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .entries-container {
          padding: 0;
        }

        .entries-table-container {
          overflow-x: auto;
        }

        .entries-table {
          width: 100%;
          border-collapse: collapse;
        }

        .entries-table th,
        .entries-table td {
          padding: 10px;
          text-align: left;
          font-size: 14px;
          vertical-align: middle;
        }

        .entries-table th {
          background-color: #f5f7fa;
          font-weight: 600;
          color: #333;
          border-bottom: 2px solid #e0e0e0;
        }

        .form-row {
          background-color: #f9f9f9;
        }

        .form-row td {
          padding: 6px;
        }

        .cell-input {
          position: relative;
        }

        .form-control {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          background-color: #fff;
        }

        .form-control:focus {
          border-color: #1a73e8;
          outline: none;
          box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
        }

        .required {
          color: #d32f2f;
          font-size: 14px;
          margin-left: 2px;
        }

        .input-required {
          border-color: #ffd0d0;
          background-color: #fff8f8;
        }

        .searchable-dropdown {
          position: relative;
        }

        .dropdown-menu {
          position: absolute;
          width: 100%;
          max-height: 200px;
          overflow-y: auto;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          z-index: 10;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          top: 100%;
          left: 0;
        }

        .dropdown-item {
          padding: 8px 10px;
          cursor: pointer;
          border-bottom: 1px solid #f0f0f0;
        }

        .dropdown-item:hover {
          background: #f5f5f5;
        }

        .dropdown-item .item-name {
          font-weight: 500;
          font-size: 14px;
        }

        .dropdown-item .item-details {
          font-size: 12px;
          color: #666;
        }

        .no-results {
          padding: 8px 10px;
          text-align: center;
          color: #999;
          font-size: 13px;
        }

        .add-button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 5px;
          background: none;
          color: #1a73e8;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
        }

        .add-button:disabled {
          background: #93b8e8;
          cursor: not-allowed;
        }

        .separator-row td {
          padding: 4px;
          border-bottom: 1px solid #ddd;
        }

        .data-row:hover {
          background-color: #f5f9ff;
        }

        .data-row td {
          border-bottom: 1px solid #eee;
        }

        .cell-content {
          display: flex;
          flex-direction: column;
        }

        .primary-text {
          font-weight: 500;
        }

        .secondary-text {
          font-size: 12px;
          color: #666;
        }

        .loading-spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s linear infinite;
          display: inline-block;
        }

        .loading-cell {
          text-align: center;
          padding: 20px;
          color: #666;
        }

        .loading-cell .loading-spinner-small {
          border: 2px solid rgba(0, 0, 0, 0.1);
          border-top-color: #1a73e8;
          margin-right: 10px;
        }

        .empty-cell {
          text-align: center;
          padding: 30px;
          color: #666;
          background: #f9f9f9;
        }

        .content-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 50px 0;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(0, 0, 0, 0.1);
          border-radius: 50%;
          border-top-color: #1a73e8;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background-color: white;
          border-radius: 6px;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .modal-header {
          padding: 15px 20px;
          border-bottom: 1px solid #eee;
        }

        .modal-header h3 {
          margin: 0;
          color: #d32f2f;
          font-size: 18px;
        }

        .modal-body {
          padding: 20px;
        }

        .duplicate-details {
          margin-top: 15px;
          padding: 15px;
          background-color: #f9f9f9;
          border-radius: 4px;
          font-size: 14px;
        }

        .duplicate-details div {
          margin-bottom: 8px;
        }

        .modal-footer {
          padding: 15px 20px;
          border-top: 1px solid #eee;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .cancel-button {
          padding: 8px 16px;
          background: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 4px;
          color: #333;
          cursor: pointer;
        }

        .confirm-button {
          padding: 8px 16px;
          background: #d32f2f;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .confirm-button:hover {
          background: #b71c1c;
        }

        .confirm-button:disabled {
          background: #e57373;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default ProductionEntries;
