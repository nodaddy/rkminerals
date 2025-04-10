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
import { processPdfInvoice } from "../../../../ai/openai-service";
import app from "../../../../firebase/config";

const db = getFirestore(app);

const DispatchEntries = () => {
  const { products, entitiesLoading, companyId } = useAppContext();
  const { showSuccess, showError } = useNotification();

  // Form state
  const [date, setDate] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [truckNumber, setTruckNumber] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // PDF upload state
  const [pdfFile, setPdfFile] = useState(null);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [apiKey, setApiKey] = useState(
    process.env.NEXT_PUBLIC_OPENAI_API_KEY || ""
  );
  const [showApiKeyInput, setShowApiKeyInput] = useState(
    !process.env.NEXT_PUBLIC_OPENAI_API_KEY
  );

  // Extraction confirmation modal
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [extractedData, setExtractedData] = useState(null);

  // Recent entries state
  const [recentEntries, setRecentEntries] = useState([]);
  const [fetchingEntries, setFetchingEntries] = useState(false);

  // Helper function to find product by name
  const findProductByName = (name) => {
    if (!name || !products || products.length === 0) return null;

    const nameLower = name.toLowerCase();

    // First try to find an exact match with technical name
    const exactTechnicalMatch = products.find(
      (p) => p.technicalName.toLowerCase() === nameLower
    );
    if (exactTechnicalMatch) return exactTechnicalMatch;

    // Then try to find an exact match with common name
    const exactCommonMatch = products.find(
      (p) => p.commonName && p.commonName.toLowerCase() === nameLower
    );
    if (exactCommonMatch) return exactCommonMatch;

    // Finally, try to find a partial match
    const partialMatch = products.find(
      (p) =>
        p.technicalName.toLowerCase().includes(nameLower) ||
        (p.commonName && p.commonName.toLowerCase().includes(nameLower))
    );
    return partialMatch || null;
  };

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
      const entriesCollectionRef = collection(companyRef, "dispatchEntries");
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

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
    } else {
      showError("Please upload a valid PDF file");
      e.target.value = null;
    }
  };

  // Process PDF using OpenAI
  const handleProcessPdf = async () => {
    if (!pdfFile) {
      showError("Please upload a PDF invoice first");
      return;
    }

    if (!apiKey) {
      showError("OpenAI API key is required");
      setShowApiKeyInput(true);
      return;
    }

    setIsProcessingPdf(true);

    try {
      const result = await processPdfInvoice(pdfFile, apiKey);

      if (result.success && result.data) {
        // Pre-populate form with extracted data
        setExtractedData(result.data);

        // Try to match the product name to a product in our database
        const matchedProduct = findProductByName(result.data.productName);

        // Show confirmation modal with extracted data
        setShowConfirmationModal(true);
      } else {
        showError(result.error || "Failed to extract data from PDF");
      }
    } catch (error) {
      console.error("Error processing PDF:", error);
      showError(error.message || "Error processing PDF");
    } finally {
      setIsProcessingPdf(false);
    }
  };

  // Handle confirmation of extracted data
  const handleConfirmExtractedData = () => {
    if (!extractedData) return;

    // Fill form fields with extracted data
    if (extractedData.date) {
      // Convert date to YYYY-MM-DD format if needed
      try {
        const dateObj = new Date(extractedData.date);
        setDate(dateObj.toISOString().split("T")[0]);
      } catch (e) {
        setDate(extractedData.date);
      }
    }

    if (extractedData.productName) {
      const matchedProduct = findProductByName(extractedData.productName);
      if (matchedProduct) {
        setSelectedProduct(matchedProduct);
      }
    }

    if (extractedData.quantity) {
      setQuantity(extractedData.quantity.toString());
    }

    if (extractedData.truckNumber) {
      setTruckNumber(extractedData.truckNumber);
    }

    if (extractedData.invoiceNumber) {
      setInvoiceNumber(extractedData.invoiceNumber);
    }

    // Close confirmation modal
    setShowConfirmationModal(false);
    setExtractedData(null);
  };

  // Handle cancellation of extracted data
  const handleCancelExtractedData = () => {
    setShowConfirmationModal(false);
    setExtractedData(null);
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

    if (!truckNumber.trim()) {
      showError("Please enter a truck number");
      return;
    }

    if (!invoiceNumber.trim()) {
      showError("Please enter an invoice number");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare the entry data
      const entryData = {
        date: Timestamp.fromDate(new Date(date)),
        product: {
          id: selectedProduct.id,
          technicalName: selectedProduct.technicalName,
          commonName: selectedProduct.commonName,
        },
        quantity: parseFloat(quantity),
        truckNumber: truckNumber.trim(),
        invoiceNumber: invoiceNumber.trim(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Get a reference to the Firestore database
      const companyRef = doc(db, "companies", companyId);

      // 1. Save the dispatch entry
      const entriesCollectionRef = collection(companyRef, "dispatchEntries");
      await addDoc(entriesCollectionRef, entryData);

      // 2. Update product stock (decrease quantity)
      const productStockCollectionRef = collection(companyRef, "productStock");

      // Check if stock record exists for this product
      const productStockQuery = query(
        productStockCollectionRef,
        where("productId", "==", selectedProduct.id)
      );

      const querySnapshot = await getDocs(productStockQuery);

      if (querySnapshot.empty) {
        // Product stock doesn't exist - can't dispatch
        showError(
          `No stock record found for ${selectedProduct.technicalName}. Cannot dispatch.`
        );
      } else {
        // Product stock exists - update the existing document
        const stockDoc = querySnapshot.docs[0];
        const stockData = stockDoc.data();

        // Check if there's enough stock
        if ((stockData.availableQuantity || 0) < parseFloat(quantity)) {
          showError(
            `Not enough stock for ${
              selectedProduct.technicalName
            }. Available: ${stockData.availableQuantity || 0} MT`
          );
        } else {
          // Update available quantity by reducing the dispatched amount
          await updateDoc(doc(productStockCollectionRef, stockDoc.id), {
            availableQuantity:
              (stockData.availableQuantity || 0) - parseFloat(quantity),
            lastUpdated: Timestamp.now(),
          });

          console.log(
            `Updated stock for ${selectedProduct.technicalName} to ${
              (stockData.availableQuantity || 0) - parseFloat(quantity)
            } units`
          );

          showSuccess("Dispatch entry added successfully!");

          // Reset form
          setDate("");
          setSelectedProduct(null);
          setQuantity("");
          setTruckNumber("");
          setInvoiceNumber("");
          setPdfFile(null);

          // Reset file input
          const fileInput = document.getElementById("pdf-upload");
          if (fileInput) fileInput.value = null;
        }
      }

      // Refresh entries if date is selected
      if (date) {
        fetchEntriesByDate(date);
      }
    } catch (error) {
      console.error("Error adding entry:", error);
      showError("Failed to add entry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className=" ">
      {/* <div className="dashboard-panel-header">
        <div className="panel-title">Dispatch Entries</div>
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
      </div> */}

      {entitiesLoading ? (
        <div className="content-loading">
          <div className="loading-spinner"></div>
          <p>Loading data...</p>
        </div>
      ) : (
        <div className=" ">
          {/* PDF Upload Section */}
          <div className="pdf-upload-section">
            <h3>Upload Invoice PDF</h3>
            <p>
              Upload a PDF invoice to automatically extract dispatch information
            </p>

            <div className="upload-container">
              <input
                type="file"
                id="pdf-upload"
                accept="application/pdf"
                onChange={handleFileChange}
                disabled={isProcessingPdf || isSubmitting}
              />

              {showApiKeyInput && (
                <div className="api-key-input">
                  <label htmlFor="openai-api-key">OpenAI API Key:</label>
                  <input
                    type="password"
                    id="openai-api-key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your OpenAI API key"
                    className="form-control"
                  />
                </div>
              )}

              <button
                type="button"
                className="process-button"
                disabled={!pdfFile || isProcessingPdf || isSubmitting}
                onClick={handleProcessPdf}
              >
                {isProcessingPdf ? (
                  <>
                    <span className="loading-spinner-small"></span>
                    <span>Processing...</span>
                  </>
                ) : (
                  "Process Invoice"
                )}
              </button>
            </div>
          </div>

          {/* Manual Entry Form */}
          <form onSubmit={handleSubmit} className="dispatch-form">
            <h3>Dispatch Entry Details</h3>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="product">
                  Product: <span className="required">*</span>
                </label>
                <select
                  id="product"
                  value={selectedProduct ? selectedProduct.id : ""}
                  onChange={(e) => {
                    const product = products.find(
                      (p) => p.id === e.target.value
                    );
                    setSelectedProduct(product || null);
                  }}
                  className={`form-control ${
                    !selectedProduct ? "input-required" : ""
                  }`}
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Select a product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.technicalName} ({product.commonName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="quantity">
                  Quantity (MT): <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  min="0.01"
                  step="0.01"
                  className={`form-control ${
                    !quantity ? "input-required" : ""
                  }`}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="truckNumber">
                  Truck Number: <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="truckNumber"
                  value={truckNumber}
                  onChange={(e) => setTruckNumber(e.target.value)}
                  placeholder="Enter truck number"
                  className={`form-control ${
                    !truckNumber ? "input-required" : ""
                  }`}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="invoiceNumber">
                  Invoice Number: <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="invoiceNumber"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Enter invoice number"
                  className={`form-control ${
                    !invoiceNumber ? "input-required" : ""
                  }`}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading-spinner-small"></span>
                    <span>Submitting...</span>
                  </>
                ) : (
                  "Add Dispatch Entry"
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Extraction Confirmation Modal */}
      {showConfirmationModal && extractedData && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Confirm Extracted Data</h3>
            </div>
            <div className="modal-body">
              <p>
                The following information was extracted from the invoice. Please
                review and confirm:
              </p>

              <div className="extracted-data">
                <div className="data-item">
                  <span className="data-label">Date:</span>
                  <span className="data-value">
                    {extractedData.date || "Not detected"}
                  </span>
                </div>
                <div className="data-item">
                  <span className="data-label">Product:</span>
                  <span className="data-value">
                    {extractedData.productName || "Not detected"}
                  </span>
                  <span className="data-match">
                    {extractedData.productName &&
                    findProductByName(extractedData.productName)
                      ? `✓ Matched to: ${
                          findProductByName(extractedData.productName)
                            .technicalName
                        }`
                      : "❌ No match found in products database"}
                  </span>
                </div>
                <div className="data-item">
                  <span className="data-label">Quantity:</span>
                  <span className="data-value">
                    {extractedData.quantity || "Not detected"} MT
                  </span>
                </div>
                <div className="data-item">
                  <span className="data-label">Truck Number:</span>
                  <span className="data-value">
                    {extractedData.truckNumber || "Not detected"}
                  </span>
                </div>
                <div className="data-item">
                  <span className="data-label">Invoice Number:</span>
                  <span className="data-value">
                    {extractedData.invoiceNumber || "Not detected"}
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="cancel-button"
                style={{ color: "#333" }}
                onClick={handleCancelExtractedData}
              >
                Cancel
              </button>
              <button
                className="confirm-button"
                onClick={handleConfirmExtractedData}
              >
                Use This Data
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
          padding: 15px 20px;
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
          padding: 20px;
        }

        .pdf-upload-section {
          background-color: #f5f7fa;
          padding: 20px;
          border-radius: 6px;
          margin-bottom: 25px;
        }

        .pdf-upload-section h3 {
          margin-top: 0;
          margin-bottom: 10px;
          color: #333;
          font-size: 18px;
        }

        .upload-container {
          display: flex;
          flex-direction: column;
          gap: 15px;
          margin-top: 15px;
        }

        .api-key-input {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .process-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 15px;
          background: #1a73e8;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s;
          align-self: flex-start;
        }

        .process-button:hover {
          background: #1557b0;
        }

        .process-button:disabled {
          background: #93b8e8;
          cursor: not-allowed;
        }

        .dispatch-form {
          background-color: #fff;
          padding: 20px;
          border-radius: 6px;
          border: 1px solid #e5e5e5;
          margin-bottom: 25px;
        }

        .dispatch-form h3 {
          margin-top: 0;
          margin-bottom: 20px;
          color: #333;
          font-size: 18px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .form-control {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .form-control:focus {
          border-color: #1a73e8;
          outline: none;
          box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
        }

        .input-required {
          border-color: #ffd0d0;
          background-color: #fff8f8;
        }

        .required {
          color: #d32f2f;
          font-size: 14px;
          margin-left: 2px;
        }

        .form-actions {
          margin-top: 20px;
          display: flex;
          justify-content: flex-end;
        }

        .submit-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 20px;
          background: #1a73e8;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .submit-button:hover {
          background: #1557b0;
        }

        .submit-button:disabled {
          background: #93b8e8;
          cursor: not-allowed;
        }

        .recent-entries {
          margin-top: 25px;
        }

        .recent-entries h3 {
          margin-bottom: 15px;
          color: #333;
          font-size: 18px;
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
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }

        .entries-table th {
          background-color: #f5f7fa;
          font-weight: 600;
          color: #333;
        }

        .entries-table tr:hover {
          background-color: #f9f9f9;
        }

        .cell-content {
          display: flex;
          flex-direction: column;
        }

        .primary-text {
          font-weight: 500;
        }

        .empty-cell,
        .loading-cell {
          text-align: center;
          padding: 30px;
          background-color: #f9f9f9;
          border-radius: 6px;
          color: #666;
        }

        .loading-cell {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .loading-spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(0, 0, 0, 0.1);
          border-radius: 50%;
          border-top-color: #1a73e8;
          animation: spin 1s linear infinite;
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

        /* Modal Styles */
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
          max-width: 600px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .modal-header {
          padding: 15px 20px;
          border-bottom: 1px solid #eee;
        }

        .modal-header h3 {
          margin: 0;
          color: #333;
          font-size: 18px;
        }

        .modal-body {
          padding: 20px;
        }

        .extracted-data {
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 6px;
          margin-top: 15px;
        }

        .data-item {
          margin-bottom: 12px;
          display: flex;
          flex-direction: column;
        }

        .data-label {
          font-weight: 600;
          color: #555;
        }

        .data-value {
          margin-top: 5px;
          font-size: 15px;
        }

        .data-match {
          margin-top: 5px;
          font-size: 13px;
          color: #4caf50;
        }

        .data-match:empty {
          display: none;
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
          cursor: pointer;
        }

        .confirm-button {
          padding: 8px 16px;
          background: #1a73e8;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .confirm-button:hover {
          background: #1557b0;
        }
      `}</style>
    </div>
  );
};

export default DispatchEntries;
