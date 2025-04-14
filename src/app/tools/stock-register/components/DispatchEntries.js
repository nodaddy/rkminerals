"use client";
// pages/index.js
import { useEffect, useState, useRef } from "react";
import JSZip from "jszip";
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
  getDoc,
  setDoc,
} from "firebase/firestore";
import app from "../../../../firebase/config";

// PDF.js is imported dynamically to avoid SSR issues
let pdfjs = null;
const db = getFirestore(app);

export default function DispatchEntries() {
  // App context
  const { products, bagTypes, entitiesLoading, companyId } = useAppContext();
  const { showSuccess, showError } = useNotification();

  // State variables
  const [pdfFile, setPdfFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [pdfJsLoaded, setPdfJsLoaded] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState("");
  const [loadingLastInvoice, setLoadingLastInvoice] = useState(false);

  // New state for handling multiple entries
  const [currentEntryIndex, setCurrentEntryIndex] = useState(0);
  const [entriesSaved, setEntriesSaved] = useState([]);

  // Dispatch form state
  const [date, setDate] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [truckNumber, setTruckNumber] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");

  // State for manual entry
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualEntryValid, setManualEntryValid] = useState(false);

  // Duplicate entry detection state
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [potentialDuplicate, setPotentialDuplicate] = useState(null);

  // Recent entries state
  const [recentEntries, setRecentEntries] = useState([]);
  const [fetchingEntries, setFetchingEntries] = useState(false);

  // Use optimized settings by default
  const conversionSettings = {
    quality: 90,
    scale: 2.0,
    pageRange: "1", // Only process the first page by default for speed
    format: "jpg",
  };

  const fileInputRef = useRef(null);

  // Initialize PDF.js only on client-side
  useEffect(() => {
    const loadPdfJs = async () => {
      try {
        if (typeof window !== "undefined") {
          const pdfjsLib = await import("pdfjs-dist");
          pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs",
            import.meta.url
          ).toString();
          pdfjs = pdfjsLib;
          setPdfJsLoaded(true);
        }
      } catch (error) {
        console.error("Failed to load PDF.js:", error);
        setError(
          "Failed to initialize the PDF converter. Please refresh the page."
        );
      }
    };

    loadPdfJs();
  }, []);

  // Initialize tab state
  useEffect(() => {
    // Explicitly set initial tab state to ensure active styling is applied
    setIsManualEntry(false);
  }, []);

  // Process the PDF automatically when a file is selected
  useEffect(() => {
    if (pdfFile && pdfJsLoaded && !processing) {
      extractDataFromPdf();
    }
  }, [pdfFile, pdfJsLoaded]);

  // Fetch entries for selected date
  useEffect(() => {
    if (date) {
      fetchEntriesByDate(date);
    } else {
      setRecentEntries([]);
    }
  }, [date, companyId]);

  // Fetch the last invoice number when component mounts
  useEffect(() => {
    if (companyId) {
      fetchLastInvoiceNumber();
    }
  }, [companyId]);

  // Validate manual entry form
  useEffect(() => {
    if (isManualEntry) {
      const isValid =
        date &&
        selectedProduct &&
        quantity &&
        parseFloat(quantity) > 0 &&
        truckNumber &&
        invoiceNumber;
      setManualEntryValid(isValid);
    }
  }, [
    isManualEntry,
    date,
    selectedProduct,
    quantity,
    truckNumber,
    invoiceNumber,
  ]);

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

  // Fetch the company's last invoice number
  const fetchLastInvoiceNumber = async () => {
    if (!companyId) return;

    setLoadingLastInvoice(true);
    try {
      const companyRef = doc(db, "companies", companyId);
      const companyDoc = await getDoc(companyRef);

      if (companyDoc.exists()) {
        const companyData = companyDoc.data();
        if (companyData.lastInvoiceNumber) {
          setLastInvoiceNumber(companyData.lastInvoiceNumber);
        }
      }
    } catch (error) {
      console.error("Error fetching last invoice number:", error);
    } finally {
      setLoadingLastInvoice(false);
    }
  };

  // Check for duplicate entries
  const checkForDuplicates = (newEntry) => {
    // Check if there's an entry with the same date, product, and invoice number
    return recentEntries.find((entry) => {
      return (
        parseInt(entry.invoiceNumber.split("/")[0]) >=
          parseInt(newEntry.invoiceNumber.split("/")[0]) &&
        entry.product.id === newEntry.product.id
      );
    });
  };

  // Handle saving to database
  const handleSaveToDatabase = async (data) => {
    if (!date || !selectedProduct || !quantity || !invoiceNumber) {
      showError("Please fill all required fields");
      return;
    }

    setSaving(true);

    try {
      // Format the data
      const formattedData = {
        date: Timestamp.fromDate(new Date(date)),
        product: {
          id: selectedProduct.id,
          technicalName: selectedProduct.technicalName,
          commonName: selectedProduct.commonName || "",
        },
        quantity: parseFloat(quantity),
        truckNumber: truckNumber || "",
        invoiceNumber: invoiceNumber,
        createdAt: Timestamp.now(),
        companyId: companyId,
      };

      // Check for duplicate entries with the same invoice number
      const potentialDuplicate = checkForDuplicates(formattedData);
      if (potentialDuplicate && !showDuplicateWarning) {
        // Show duplicate warning
        setPotentialDuplicate(formattedData);
        setShowDuplicateWarning(true);
        setSaving(false);
        return;
      }

      // 1. Save the dispatch entry
      const dispatchRef = collection(
        doc(db, "companies", companyId),
        "dispatchEntries"
      );
      const docRef = await addDoc(dispatchRef, formattedData);
      console.log("Document saved with ID: ", docRef.id);

      // 2. Update product stock (DECREASE stock for dispatch)   // 2. Update product stock
      const productStockCollectionRef = collection(
        doc(db, "companies", companyId),
        "productStock"
      );

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
          availableQuantity: 0 - parseFloat(quantity),
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
            (stockData.availableQuantity || 0) - parseFloat(quantity),
          lastUpdated: Timestamp.now(),
        });
        console.log(
          `Updated stock for ${selectedProduct.technicalName} to ${
            (stockData.availableQuantity || 0) - parseFloat(quantity)
          } units`
        );
      }

      // 3. Try to update company's lastInvoiceNumber
      try {
        // First, check if company document exists
        const companyRef = doc(db, "companies", companyId);
        const companyDoc = await getDoc(companyRef);

        if (companyDoc.exists()) {
          // Document exists, update it
          await updateDoc(companyRef, {
            lastInvoiceNumber: formattedData.invoiceNumber,
            lastUpdated: Timestamp.now(),
          });
          console.log(
            `Updated company's lastInvoiceNumber to ${formattedData.invoiceNumber}`
          );

          // Update the lastInvoiceNumber in the UI
          setLastInvoiceNumber(formattedData.invoiceNumber);
        } else {
          // Document doesn't exist, create it
          await setDoc(companyRef, {
            lastInvoiceNumber: formattedData.invoiceNumber,
            lastUpdated: Timestamp.now(),
            name: "Company", // Default name in case it's a new company
            createdAt: Timestamp.now(),
          });
          console.log(
            `Created company document with lastInvoiceNumber: ${formattedData.invoiceNumber}`
          );

          // Update the lastInvoiceNumber in the UI
          setLastInvoiceNumber(formattedData.invoiceNumber);
        }
      } catch (error) {
        console.error("Error updating company document:", error);
        // Continue with the flow - this error shouldn't prevent the main operation
        // Just log it for troubleshooting
      }

      // Mark the current entry as saved
      markEntrySaved(currentEntryIndex);

      // Show success indicator
      showSuccess("Dispatch entry saved successfully!");

      // Check if there are more entries to save
      if (
        extractedData &&
        extractedData.entries &&
        currentEntryIndex < extractedData.entries.length - 1
      ) {
        // Go to the next entry
        goToNextEntry();
      } else {
        // All entries for this invoice have been processed
        // Reset the form and close the dialog
        setExtractedData(null);
        setShowConfirmation(false);
        setPdfFile(null);
        resetFormFields();
      }

      // Refresh entries list for the current date
      fetchEntriesByDate(date);
    } catch (error) {
      console.error("Error saving to database:", error);
      showError("Error saving to database: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Reset form fields
  const resetFormFields = () => {
    setSelectedProduct(null);
    setQuantity("");
    setTruckNumber("");
    setInvoiceNumber("");
    setShowDuplicateWarning(false);
  };

  // Handle duplicate confirmation
  const confirmDuplicate = () => {
    setShowDuplicateWarning(false);
    handleSaveToDatabase(potentialDuplicate);
  };

  // Handle duplicate cancellation
  const cancelDuplicate = () => {
    setShowDuplicateWarning(false);
    setPotentialDuplicate(null);
  };

  // Handle file input change
  const handleFileChange = async (e) => {
    setError("");
    setExtractedData(null);
    setShowConfirmation(false);
    const file = e.target.files?.[0] || null;
    if (file && file.type === "application/pdf") {
      handlePdfSelection(file);
    } else if (file) {
      setError("Please select a valid PDF file");
    }
  };

  // Handle PDF file selection
  const handlePdfSelection = async (file) => {
    if (!pdfjs || !pdfJsLoaded) {
      setError("PDF converter is still loading. Please try again in a moment.");
      return;
    }

    setPdfFile(file);
    setFileName(file.name.replace(".pdf", ""));
    setProgress(0);
    setError("");

    try {
      const reader = new FileReader();
      reader.onload = async function (event) {
        const typedArray = new Uint8Array(event.target.result);
        const pdf = await pdfjs.getDocument({ data: typedArray }).promise;
        setPageCount(pdf.numPages);
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("Error loading PDF:", error);
      setError("Error loading PDF. Please try another file.");
    }
  };

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError("");

    const file = e.dataTransfer.files?.[0] || null;
    if (file && file.type === "application/pdf") {
      handlePdfSelection(file);
    } else if (file) {
      setError("Please select a valid PDF file");
    }
  };

  // Process image with OpenAI Vision API to directly extract structured data
  const processImageWithOpenAI = async (imageDataUrl) => {
    try {
      const response = await fetch("/api/extract-json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: imageDataUrl }),
      });

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error("Error processing image with OpenAI:", error);
      throw error;
    }
  };

  // Convert PDF to image and extract structured data directly
  const extractDataFromPdf = async () => {
    if (!pdfFile || !pdfjs || !pdfJsLoaded) return;

    setProcessing(true);
    setProgress(0);
    setError("");
    setCurrentEntryIndex(0);
    setEntriesSaved([]);

    try {
      const reader = new FileReader();
      reader.onload = async function (event) {
        try {
          const typedArray = new Uint8Array(event.target.result);
          const pdf = await pdfjs.getDocument({ data: typedArray }).promise;

          // Just process the first page for efficiency
          const pagesToProcess = [1];

          let currentImage = null;

          for (let i = 0; i < pagesToProcess.length; i++) {
            const pageNumber = pagesToProcess[i];
            const page = await pdf.getPage(pageNumber);

            // Set viewport using scale factor for higher quality
            const viewport = page.getViewport({
              scale: conversionSettings.scale,
            });

            // Create canvas
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // Render PDF page to canvas
            await page.render({
              canvasContext: context,
              viewport: viewport,
            }).promise;

            // Convert canvas to image data
            const imgType = "image/jpeg"; // Always use jpg for OpenAI
            const imageData = canvas.toDataURL(
              imgType,
              conversionSettings.quality / 100
            );

            // Store the first image for data extraction
            currentImage = imageData;

            // Update progress
            setProgress(100); // Only one page, so set to 100%
          }

          // Process the image with OpenAI to directly extract structured data
          if (currentImage) {
            try {
              const extractedData = await processImageWithOpenAI(currentImage);

              // Initialize arrays for tracking saved entries
              if (extractedData.entries && extractedData.entries.length > 0) {
                setEntriesSaved(
                  new Array(extractedData.entries.length).fill(false)
                );
              }

              // Set common fields
              if (extractedData.date) {
                const dateObj = new Date(extractedData.date);
                if (!isNaN(dateObj.getTime())) {
                  // Fix the date offset issue by adding a day
                  dateObj.setDate(dateObj.getDate() + 1);
                  setDate(dateObj.toISOString().split("T")[0]);
                }
              }

              if (extractedData.truckNumber) {
                setTruckNumber(extractedData.truckNumber);
              }

              if (extractedData.invoiceNumber) {
                setInvoiceNumber(extractedData.invoiceNumber);
              }

              // Set the first entry's data (if available)
              setEntryData(extractedData, 0);

              // Store the extracted data and invoice image for preview
              setExtractedData({
                ...extractedData,
                invoiceImage: currentImage,
              });
              setShowConfirmation(true);
            } catch (error) {
              console.error("Error extracting data:", error);
              setError("Error extracting data from image: " + error.message);
            }
          } else {
            throw new Error("Failed to generate image from PDF");
          }
        } catch (error) {
          console.error("Error processing PDF:", error);
          setError("Error processing PDF: " + error.message);
        } finally {
          setProcessing(false);
        }
      };

      reader.readAsArrayBuffer(pdfFile);
    } catch (error) {
      console.error("Error converting PDF:", error);
      setError("Error during conversion. Please try again with another file.");
      setProcessing(false);
    }
  };

  // Helper function to set the current entry data
  const setEntryData = (data, index) => {
    if (!data || !data.entries || !data.entries[index]) return;

    const entry = data.entries[index];

    // Find product from the extracted product name if available
    if (entry.product) {
      const matchedProduct = products.find(
        (p) =>
          p.technicalName
            ?.toLowerCase()
            .includes(entry.product.toLowerCase()) ||
          p.commonName?.toLowerCase().includes(entry.product.toLowerCase())
      );

      if (matchedProduct) {
        setSelectedProduct(matchedProduct);
      } else {
        setSelectedProduct(null);
      }
    } else {
      setSelectedProduct(null);
    }

    if (entry.quantity) {
      setQuantity(entry.quantity);
    } else {
      setQuantity("");
    }
  };

  // Function to navigate to the previous entry
  const goToPreviousEntry = () => {
    if (extractedData && extractedData.entries && currentEntryIndex > 0) {
      setCurrentEntryIndex(currentEntryIndex - 1);
      setEntryData(extractedData, currentEntryIndex - 1);
    }
  };

  // Function to navigate to the next entry
  const goToNextEntry = () => {
    if (
      extractedData &&
      extractedData.entries &&
      currentEntryIndex < extractedData.entries.length - 1
    ) {
      setCurrentEntryIndex(currentEntryIndex + 1);
      setEntryData(extractedData, currentEntryIndex + 1);
    }
  };

  // Function to mark current entry as saved
  const markEntrySaved = (index) => {
    const updatedEntriesSaved = [...entriesSaved];
    updatedEntriesSaved[index] = true;
    setEntriesSaved(updatedEntriesSaved);
  };

  // State for magnifier
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [magnifierPosition, setMagnifierPosition] = useState({ x: 0, y: 0 });
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const imageRef = useRef(null);

  // Handle mouse move for magnifier
  const handleMouseMove = (e) => {
    if (!imageRef.current) return;

    const { left, top, width, height } =
      imageRef.current.getBoundingClientRect();

    // Calculate position as percentage for background-position
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;

    setCursorPosition({ x, y });
    setMagnifierPosition({
      x: e.clientX - left,
      y: e.clientY - top,
    });
  };

  // Handle manual entry submission
  const handleManualSubmit = (e) => {
    e.preventDefault();

    if (!manualEntryValid) {
      showError("Please fill all required fields");
      return;
    }

    const entryData = {
      product: selectedProduct,
      quantity,
      truckNumber,
      invoiceNumber,
    };

    handleSaveToDatabase(entryData);
  };

  return (
    <div
      style={{
        fontFamily:
          "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        backgroundColor: "#f9fafb",
        borderRadius: "0.5rem",
        boxShadow:
          "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        marginBottom: "1.5rem",
      }}
    >
      <div style={{ padding: "1.5rem" }}>
        <div
          style={{ maxWidth: "56rem", marginLeft: "auto", marginRight: "auto" }}
        >
          {/* Tab Navigation */}
          <div
            style={{
              display: "flex",
              marginBottom: "1.5rem",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <button
              onClick={() => setIsManualEntry(false)}
              className={`tab-button ${!isManualEntry ? "active-tab" : ""}`}
              style={{
                padding: "0.75rem 1.25rem",
                fontWeight: "500",
                fontSize: "0.95rem",
                color: !isManualEntry ? "var(--primary, #ff4040)" : "#6b7280",
                background: "none",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                marginRight: "1rem",
              }}
            >
              Upload Invoice
            </button>
            <button
              onClick={() => setIsManualEntry(true)}
              className={`tab-button ${isManualEntry ? "active-tab" : ""}`}
              style={{
                padding: "0.75rem 1.25rem",
                fontWeight: "500",
                fontSize: "0.95rem",
                color: isManualEntry ? "var(--primary, #ff4040)" : "#6b7280",
                background: "none",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Manual Entry
            </button>
          </div>

          {/* Previous Invoice Number Display */}
          {lastInvoiceNumber && (
            <div
              style={{
                textAlign: "left",
                marginBottom: "1rem",
                padding: "0.5rem 1rem",
                backgroundColor: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: "0.375rem",
                display: "inline-block",
                float: "left",
              }}
            >
              <span
                style={{
                  fontSize: "0.875rem",
                  color: "#0369a1",
                  fontWeight: "500",
                }}
              >
                Previous Invoice:
              </span>
              <span
                style={{
                  fontSize: "0.875rem",
                  color: "#0284c7",
                  fontWeight: "600",
                  marginLeft: "0.5rem",
                }}
              >
                {lastInvoiceNumber}
              </span>
            </div>
          )}

          {/* Loading state for last invoice */}
          {loadingLastInvoice && (
            <div
              style={{
                textAlign: "left",
                marginBottom: "1rem",
                float: "left",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <div
                  style={{
                    width: "1rem",
                    height: "1rem",
                    border: "2px solid #e5e7eb",
                    borderTopColor: "#6366f1",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                ></div>
                <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                  Loading last invoice...
                </span>
              </div>
            </div>
          )}

          {/* Clear floating elements */}
          <div style={{ clear: "both" }}></div>

          {/* Manual Entry Form */}
          {isManualEntry ? (
            <div
              style={{
                background: "white",
                borderRadius: "0.75rem",
                boxShadow:
                  "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb",
                overflow: "hidden",
                marginBottom: "2rem",
              }}
            >
              <div
                style={{
                  background: "linear-gradient(to right, #ff4040, #ff6b6b)",
                  padding: "1rem 1.5rem",
                }}
              >
                <h2
                  style={{
                    color: "white",
                    fontSize: "1.125rem",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    style={{ height: "1.25rem", width: "1.25rem" }}
                  >
                    <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" />
                  </svg>
                  Manual Dispatch Entry
                </h2>
              </div>

              <form onSubmit={handleManualSubmit} style={{ padding: "1.5rem" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: "1.5rem",
                  }}
                >
                  {/* Date Field */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Invoice Date <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        borderRadius: "0.375rem",
                        border: "1px solid #d1d5db",
                        fontSize: "0.875rem",
                        color: "#1f2937",
                        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                      }}
                      required
                    />
                  </div>

                  {/* Product Field */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Product <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select
                      value={selectedProduct ? selectedProduct.id : ""}
                      onChange={(e) => {
                        const selected = products.find(
                          (p) => p.id === e.target.value
                        );
                        setSelectedProduct(selected || null);
                      }}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        borderRadius: "0.375rem",
                        border: "1px solid #d1d5db",
                        fontSize: "0.875rem",
                        color: "#1f2937",
                        backgroundColor: "white",
                        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                      }}
                      required
                    >
                      <option value="">Select a product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.technicalName} ({product.commonName})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity Field */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Quantity (MT) <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      min="0.01"
                      step="0.01"
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        borderRadius: "0.375rem",
                        border: "1px solid #d1d5db",
                        fontSize: "0.875rem",
                        color: "#1f2937",
                        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                      }}
                      required
                    />
                  </div>

                  {/* Truck Number Field */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Truck Number <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={truckNumber}
                      onChange={(e) => setTruckNumber(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        borderRadius: "0.375rem",
                        border: "1px solid #d1d5db",
                        fontSize: "0.875rem",
                        color: "#1f2937",
                        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                      }}
                      required
                    />
                  </div>

                  {/* Invoice Number Field */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Invoice Number <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        borderRadius: "0.375rem",
                        border: "1px solid #d1d5db",
                        fontSize: "0.875rem",
                        color: "#1f2937",
                        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                      }}
                      required
                    />
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "2rem",
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="submit"
                    disabled={!manualEntryValid || saving}
                    style={{
                      padding: "0.75rem 1.5rem",
                      backgroundColor: "var(--primary, #ff4040)",
                      color: "white",
                      border: "none",
                      borderRadius: "0.375rem",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      cursor:
                        manualEntryValid && !saving ? "pointer" : "not-allowed",
                      opacity: manualEntryValid && !saving ? 1 : 0.7,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                      transition: "all 0.2s",
                    }}
                  >
                    {saving ? (
                      <>
                        <svg
                          style={{
                            animation: "spin 1s linear infinite",
                            height: "1rem",
                            width: "1rem",
                          }}
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            style={{ opacity: 0.25 }}
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            style={{ opacity: 0.75 }}
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          style={{ height: "1rem", width: "1rem" }}
                        >
                          <path
                            fillRule="evenodd"
                            d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Save Dispatch Entry
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Upload Container - show only if not in manual entry mode */
            <div
              style={{
                background: "white",
                borderRadius: "0.75rem",
                boxShadow:
                  "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div
                style={{
                  background: "linear-gradient(to right, #ff4040, #ff6b6b)",
                  padding: "1rem 1.5rem",
                }}
              >
                <h2
                  style={{
                    color: "white",
                    fontSize: "1.125rem",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ height: "1.25rem", width: "1.25rem" }}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path
                      fillRule="evenodd"
                      d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Extract Dispatch Information
                </h2>
                <p
                  style={{
                    color: "#ffe7e7",
                    fontSize: "0.875rem",
                    marginTop: "0.25rem",
                  }}
                >
                  Upload your dispatch PDF invoice to automatically extract key
                  information
                </p>
              </div>

              {/* Upload Container */}
              <div style={{ padding: "1.5rem" }}>
                {/* File Upload Section */}
                <div
                  style={{
                    border: `2px dashed ${
                      dragActive ? "var(--primary, #ff4040)" : "#d1d5db"
                    }`,
                    borderRadius: "0.75rem",
                    padding: "2rem",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.3s",
                    backgroundColor: dragActive ? "#fff5f5" : "transparent",
                    transform: dragActive ? "scale(1.02)" : "none",
                    boxShadow: dragActive
                      ? "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                      : "none",
                    margin: "1.5rem",
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf"
                    style={{ display: "none" }}
                  />

                  {!pdfFile ? (
                    <div style={{ padding: "1.5rem 0" }}>
                      <div
                        style={{
                          margin: "0 auto",
                          width: "4rem",
                          height: "4rem",
                          marginBottom: "1rem",
                          backgroundColor: "#ffe7e7",
                          color: "var(--primary, #ff4040)",
                          borderRadius: "9999px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          style={{ height: "2rem", width: "2rem" }}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <p
                        style={{
                          fontSize: "1.25rem",
                          fontWeight: "500",
                          color: "#374151",
                          marginBottom: "0.5rem",
                        }}
                      >
                        Drop a Dispatch Invoice PDF here
                      </p>
                      <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
                        or{" "}
                        <span
                          style={{
                            color: "var(--primary, #ff4040)",
                            fontWeight: "500",
                          }}
                        >
                          browse
                        </span>{" "}
                        to upload
                      </p>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.5rem",
                          fontSize: "0.875rem",
                          color: "#6b7280",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            style={{
                              height: "1rem",
                              width: "1rem",
                              marginRight: "0.25rem",
                              color: "var(--primary, #ff4040)",
                            }}
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          PDF format only
                        </div>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            style={{
                              height: "1rem",
                              width: "1rem",
                              marginRight: "0.25rem",
                              color: "var(--primary, #ff4040)",
                            }}
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Auto-processed on upload
                        </div>
                      </div>

                      {!pdfJsLoaded && (
                        <div
                          style={{
                            marginTop: "1rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#d97706",
                            gap: "0.5rem",
                          }}
                        >
                          <svg
                            style={{
                              animation: "spin 1s linear infinite",
                              height: "1rem",
                              width: "1rem",
                            }}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              style={{ opacity: 0.25 }}
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              style={{ opacity: 0.75 }}
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Initializing converter...
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: "1rem 0" }}>
                      <div
                        style={{
                          margin: "0 auto",
                          width: "3.5rem",
                          height: "3.5rem",
                          marginBottom: "0.75rem",
                          backgroundColor: "var(--primary, #ff4040)",
                          color: "white",
                          borderRadius: "9999px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          style={{ height: "1.75rem", width: "1.75rem" }}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <p
                        style={{
                          fontSize: "1.125rem",
                          fontWeight: "500",
                          color: "var(--primary, #ff4040)",
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          maxWidth: "24rem",
                          marginLeft: "auto",
                          marginRight: "auto",
                        }}
                        title={pdfFile.name}
                      >
                        {pdfFile.name}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.75rem",
                          marginTop: "0.5rem",
                        }}
                      >
                        <div
                          style={{
                            padding: "0 0.75rem",
                            paddingTop: "0.25rem",
                            paddingBottom: "0.25rem",
                            backgroundColor: "#ffe7e7",
                            color: "var(--primary-dark, #d62c2c)",
                            borderRadius: "9999px",
                            fontSize: "0.75rem",
                            fontWeight: "500",
                          }}
                        >
                          {pageCount} {pageCount === 1 ? "page" : "pages"}
                        </div>
                        <div
                          style={{
                            padding: "0 0.75rem",
                            paddingTop: "0.25rem",
                            paddingBottom: "0.25rem",
                            backgroundColor: "#ffe7e7",
                            color: "var(--primary-dark, #d62c2c)",
                            borderRadius: "9999px",
                            fontSize: "0.75rem",
                            fontWeight: "500",
                          }}
                        >
                          {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPdfFile(null);
                            setExtractedData(null);
                            setShowConfirmation(false);
                            setError("");
                          }}
                          style={{
                            padding: "0 0.75rem",
                            paddingTop: "0.25rem",
                            paddingBottom: "0.25rem",
                            backgroundColor: "#fee2e2",
                            color: "#dc2626",
                            borderRadius: "9999px",
                            fontSize: "0.75rem",
                            fontWeight: "500",
                            transition: "background-color 0.3s",
                          }}
                          onMouseOver={(e) =>
                            (e.currentTarget.style.backgroundColor = "#fecaca")
                          }
                          onMouseOut={(e) =>
                            (e.currentTarget.style.backgroundColor = "#fee2e2")
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status and Progress */}
                {processing && (
                  <div
                    style={{
                      marginTop: "1.5rem",
                      backgroundColor: "#fff5f5",
                      borderRadius: "0.75rem",
                      padding: "1.25rem",
                      border: "1px solid #fee2e2",
                      margin: "0 1.5rem 1.5rem 1.5rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: "0.75rem",
                        }}
                      >
                        <div style={{ position: "relative" }}>
                          <div
                            style={{
                              width: "3rem",
                              height: "3rem",
                              borderRadius: "9999px",
                              border: "2px solid #fecaca",
                            }}
                          ></div>
                          <div
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "3rem",
                              height: "3rem",
                            }}
                          >
                            <div
                              style={{
                                width: "3rem",
                                height: "3rem",
                                borderRadius: "9999px",
                                border: "2px solid var(--primary, #ff4040)",
                                borderTopColor: "transparent",
                                animation: "spin 1s linear infinite",
                              }}
                            ></div>
                          </div>
                          <div
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "3rem",
                              height: "3rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "var(--primary, #ff4040)",
                              fontWeight: "600",
                              fontSize: "0.875rem",
                            }}
                          >
                            {/* {progress}% */}
                          </div>
                        </div>
                      </div>
                      <p
                        style={{
                          color: "var(--primary-dark, #d62c2c)",
                          fontWeight: "500",
                          marginBottom: "0.5rem",
                        }}
                      >
                        Processing Invoice
                      </p>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div
                    style={{
                      marginTop: "1.5rem",
                      backgroundColor: "#fef2f2",
                      borderRadius: "0.75rem",
                      padding: "1.25rem",
                      border: "1px solid #fee2e2",
                      animation: "fade-in 0.3s ease-out forwards",
                      margin: "0 1.5rem 1.5rem 1.5rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start" }}>
                      <div style={{ flexShrink: 0 }}>
                        <svg
                          style={{
                            height: "1.25rem",
                            width: "1.25rem",
                            color: "#ef4444",
                          }}
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div style={{ marginLeft: "0.75rem" }}>
                        <h3
                          style={{
                            fontSize: "0.875rem",
                            fontWeight: "500",
                            color: "#991b1b",
                          }}
                        >
                          An error occurred
                        </h3>
                        <div
                          style={{
                            marginTop: "0.25rem",
                            fontSize: "0.875rem",
                            color: "#b91c1c",
                          }}
                        >
                          {error}
                        </div>
                        <div style={{ marginTop: "0.75rem" }}>
                          <button
                            type="button"
                            onClick={() => setError("")}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "0 0.75rem",
                              paddingTop: "0.375rem",
                              paddingBottom: "0.375rem",
                              border: "1px solid transparent",
                              fontSize: "0.75rem",
                              fontWeight: "500",
                              borderRadius: "0.375rem",
                              color: "#b91c1c",
                              backgroundColor: "#fee2e2",
                              cursor: "pointer",
                            }}
                            onMouseOver={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                "#fecaca")
                            }
                            onMouseOut={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                "#fee2e2")
                            }
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && extractedData && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            animation: "fade-in 0.2s ease-out",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "0.75rem",
              width: "100%",
              maxWidth: "90%",
              maxHeight: "90vh",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                background:
                  "linear-gradient(to right, var(--primary, #ff4040), var(--primary-light, #ff6b6b))",
                padding: "1rem 1.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                color: "white",
              }}
            >
              <h3
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "600",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  style={{ height: "1.25rem", width: "1.25rem" }}
                >
                  <path
                    fillRule="evenodd"
                    d="M9 1.5H5.625c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5zm6.61 10.936a.75.75 0 10-1.22.872l1.5 2.1a.75.75 0 001.164.114l3.75-4.5a.75.75 0 10-1.154-.96l-3.089 3.708-1.951-2.334z"
                    clipRule="evenodd"
                  />
                </svg>
                Confirm Dispatch Entry
              </h3>
              <button
                onClick={() => setShowConfirmation(false)}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  padding: "0.25rem",
                  borderRadius: "9999px",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background-color 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.2)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.1)")
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ height: "1.25rem", width: "1.25rem" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "row",
                height: "calc(90vh - 4rem)",
                overflow: "hidden",
              }}
            >
              {/* Form Fields */}
              <div
                style={{
                  padding: "1.5rem",
                  width: "40%",
                  borderRight: "1px solid #e5e7eb",
                  overflowY: "auto",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#f9fafb",
                    borderRadius: "0.5rem",
                    padding: "0.75rem 1rem",
                    marginBottom: "1.5rem",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "#4b5563",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      style={{
                        height: "1rem",
                        width: "1rem",
                        color: "var(--primary, #ff4040)",
                      }}
                    >
                      <path
                        fillRule="evenodd"
                        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Please review the extracted information and make any
                    necessary corrections before saving.
                  </p>
                </div>

                <div style={{ display: "grid", gap: "1.25rem" }}>
                  {/* Date Field */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "0.375rem",
                      }}
                    >
                      Invoice Date <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.625rem 0.75rem",
                        borderRadius: "0.375rem",
                        border: "1px solid #d1d5db",
                        fontSize: "0.875rem",
                        color: "#1f2937",
                        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                      }}
                      required
                    />
                  </div>

                  {/* Product Field */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "0.375rem",
                      }}
                    >
                      Product <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select
                      value={selectedProduct ? selectedProduct.id : ""}
                      onChange={(e) => {
                        const selected = products.find(
                          (p) => p.id === e.target.value
                        );
                        setSelectedProduct(selected || null);
                      }}
                      style={{
                        width: "100%",
                        padding: "0.625rem 0.75rem",
                        borderRadius: "0.375rem",
                        border: "1px solid #d1d5db",
                        fontSize: "0.875rem",
                        color: "#1f2937",
                        backgroundColor: "white",
                        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                      }}
                      required
                    >
                      <option value="">Select a product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.technicalName} ({product.commonName})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity Field */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "0.375rem",
                      }}
                    >
                      Quantity (MT) <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      min="0.01"
                      step="0.01"
                      style={{
                        width: "100%",
                        padding: "0.625rem 0.75rem",
                        borderRadius: "0.375rem",
                        border: "1px solid #d1d5db",
                        fontSize: "0.875rem",
                        color: "#1f2937",
                        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                      }}
                      required
                    />
                  </div>

                  {/* Truck Number Field */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "0.375rem",
                      }}
                    >
                      Truck Number <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={truckNumber}
                      onChange={(e) => setTruckNumber(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.625rem 0.75rem",
                        borderRadius: "0.375rem",
                        border: "1px solid #d1d5db",
                        fontSize: "0.875rem",
                        color: "#1f2937",
                        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                      }}
                      required
                    />
                  </div>

                  {/* Invoice Number Field */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "0.375rem",
                      }}
                    >
                      Invoice Number <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.625rem 0.75rem",
                        borderRadius: "0.375rem",
                        border: "1px solid #d1d5db",
                        fontSize: "0.875rem",
                        color: "#1f2937",
                        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                      }}
                      required
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "0.75rem",
                    marginTop: "1.5rem",
                    borderTop: "1px solid #e5e7eb",
                    paddingTop: "1.5rem",
                  }}
                >
                  <button
                    onClick={() => {
                      setShowConfirmation(false);
                      setExtractedData(null);
                      setPdfFile(null);
                      resetFormFields();
                    }}
                    style={{
                      padding: "0.625rem 1.25rem",
                      backgroundColor: "#f3f4f6",
                      color: "#374151",
                      border: "none",
                      borderRadius: "0.375rem",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      cursor: "pointer",
                      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.backgroundColor = "#e5e7eb")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.backgroundColor = "#f3f4f6")
                    }
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() =>
                      handleSaveToDatabase({
                        product: selectedProduct,
                        quantity,
                        truckNumber,
                        invoiceNumber,
                      })
                    }
                    disabled={saving}
                    style={{
                      padding: "0.625rem 1.25rem",
                      backgroundColor: "var(--primary, #ff4040)",
                      color: "white",
                      border: "none",
                      borderRadius: "0.375rem",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      cursor: saving ? "not-allowed" : "pointer",
                      opacity: saving ? 0.7 : 1,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                    }}
                    onMouseOver={(e) => {
                      if (!saving)
                        e.currentTarget.style.backgroundColor =
                          "var(--primary-dark, #d62c2c)";
                    }}
                    onMouseOut={(e) => {
                      if (!saving)
                        e.currentTarget.style.backgroundColor =
                          "var(--primary, #ff4040)";
                    }}
                  >
                    {saving ? (
                      <>
                        <svg
                          style={{
                            animation: "spin 1s linear infinite",
                            height: "1rem",
                            width: "1rem",
                          }}
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            style={{ opacity: 0.25 }}
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            style={{ opacity: 0.75 }}
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          style={{ height: "1rem", width: "1rem" }}
                        >
                          <path
                            fillRule="evenodd"
                            d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Save Dispatch Entry
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Invoice Preview */}
              <div
                style={{
                  width: "60%",
                  padding: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#f9fafb",
                    borderRadius: "0.5rem",
                    padding: "0.75rem 1rem",
                    marginBottom: "1rem",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <h4
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      color: "#374151",
                      marginBottom: "0.375rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      style={{
                        height: "1rem",
                        width: "1rem",
                        color: "var(--primary, #ff4040)",
                      }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Invoice Preview
                  </h4>
                  <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                    Hover over the invoice to magnify details
                  </p>
                </div>

                {/* Add Entry Navigation if multiple entries exist */}
                {extractedData &&
                  extractedData.entries &&
                  extractedData.entries.length > 1 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        marginBottom: "1rem",
                        padding: "0.5rem",
                        backgroundColor: "#f9fafb",
                        borderRadius: "0.5rem",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <button
                        onClick={goToPreviousEntry}
                        disabled={currentEntryIndex === 0}
                        style={{
                          padding: "0.5rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "none",
                          backgroundColor:
                            currentEntryIndex === 0 ? "#e5e7eb" : "#f3f4f6",
                          borderRadius: "0.375rem",
                          cursor:
                            currentEntryIndex === 0 ? "not-allowed" : "pointer",
                          color:
                            currentEntryIndex === 0 ? "#9ca3af" : "#374151",
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          style={{ height: "1.25rem", width: "1.25rem" }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 19.5L8.25 12l7.5-7.5"
                          />
                        </svg>
                      </button>

                      <div
                        style={{
                          margin: "0 1rem",
                          display: "flex",
                          gap: "0.5rem",
                        }}
                      >
                        {extractedData.entries.map((entry, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setCurrentEntryIndex(index);
                              setEntryData(extractedData, index);
                            }}
                            style={{
                              width: "2rem",
                              height: "2rem",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "none",
                              backgroundColor:
                                currentEntryIndex === index
                                  ? "var(--primary, #ff4040)"
                                  : entriesSaved[index]
                                  ? "#10b981"
                                  : "#e5e7eb",
                              color:
                                currentEntryIndex === index ||
                                entriesSaved[index]
                                  ? "white"
                                  : "#6b7280",
                              cursor: "pointer",
                              position: "relative",
                            }}
                          >
                            {index + 1}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={goToNextEntry}
                        disabled={
                          currentEntryIndex === extractedData.entries.length - 1
                        }
                        style={{
                          padding: "0.5rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "none",
                          backgroundColor:
                            currentEntryIndex ===
                            extractedData.entries.length - 1
                              ? "#e5e7eb"
                              : "#f3f4f6",
                          borderRadius: "0.375rem",
                          cursor:
                            currentEntryIndex ===
                            extractedData.entries.length - 1
                              ? "not-allowed"
                              : "pointer",
                          color:
                            currentEntryIndex ===
                            extractedData.entries.length - 1
                              ? "#9ca3af"
                              : "#374151",
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          style={{ height: "1.25rem", width: "1.25rem" }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8.25 4.5l7.5 7.5-7.5 7.5"
                          />
                        </svg>
                      </button>
                    </div>
                  )}

                <div
                  style={{
                    flex: "1",
                    overflow: "auto",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "flex-start",
                    backgroundColor: "#f3f4f6",
                    borderRadius: "0.5rem",
                    position: "relative",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  {extractedData.invoiceImage ? (
                    <div
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        boxShadow:
                          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                        overflow: "hidden",
                        borderRadius: "0.25rem",
                        backgroundColor: "white",
                        position: "relative",
                        cursor: "none",
                      }}
                      onMouseEnter={() => setShowMagnifier(true)}
                      onMouseLeave={() => setShowMagnifier(false)}
                      onMouseMove={handleMouseMove}
                    >
                      <img
                        ref={imageRef}
                        src={extractedData.invoiceImage}
                        alt="Invoice Preview"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          objectFit: "contain",
                        }}
                      />

                      {/* Magnifier Glass */}
                      {showMagnifier && (
                        <div
                          style={{
                            position: "absolute",
                            top: magnifierPosition.y - 85,
                            left: magnifierPosition.x - 85,
                            width: "350px",
                            height: "350px",
                            borderRadius: "50%",
                            border: "2px solid silver",
                            pointerEvents: "none",
                            backgroundImage: `url(${extractedData.invoiceImage})`,
                            backgroundPosition: `${cursorPosition.x}% ${cursorPosition.y}%`,
                            backgroundRepeat: "no-repeat",
                            backgroundSize: "400%",
                            zIndex: 10,
                            boxShadow:
                              "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#6b7280",
                        padding: "2rem",
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        style={{
                          height: "3rem",
                          width: "3rem",
                          marginBottom: "1rem",
                          opacity: 0.5,
                        }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p>No invoice preview available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Confirmation Modal */}
      {showDuplicateWarning && potentialDuplicate && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            animation: "fade-in 0.2s ease-out",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "0.75rem",
              width: "100%",
              maxWidth: "500px",
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
          >
            <div
              style={{
                background: "linear-gradient(to right, #f59e0b, #f97316)",
                padding: "1rem 1.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                color: "white",
              }}
            >
              <h3
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "600",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  style={{ height: "1.25rem", width: "1.25rem" }}
                >
                  <path
                    fillRule="evenodd"
                    d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
                    clipRule="evenodd"
                  />
                </svg>
                Confirm Duplicate Entry
              </h3>
              <button
                onClick={() => cancelDuplicate()}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  padding: "0.25rem",
                  borderRadius: "9999px",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background-color 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.2)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.1)")
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ height: "1.25rem", width: "1.25rem" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div style={{ padding: "1.5rem" }}>
              <div
                style={{
                  marginBottom: "1.5rem",
                  padding: "1rem",
                  backgroundColor: "#fff7ed",
                  border: "1px solid #ffedd5",
                  borderRadius: "0.5rem",
                  color: "#c2410c",
                }}
              >
                <p
                  style={{
                    fontSize: "0.875rem",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                      flexShrink: 0,
                      height: "1.25rem",
                      width: "1.25rem",
                      marginTop: "0.125rem",
                    }}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>
                    <strong>Potential Duplicate:</strong> An entry with a
                    similar invoice number already exists in the system. Please
                    verify the information before saving.
                  </span>
                </p>
              </div>

              <div style={{ display: "grid", gap: "1rem" }}>
                {/* Date Field */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "0.375rem",
                    }}
                  >
                    Date
                  </label>
                  <input
                    type="text"
                    value={
                      potentialDuplicate.date
                        ? new Date(potentialDuplicate.date).toLocaleDateString()
                        : ""
                    }
                    readOnly
                    style={{
                      width: "100%",
                      padding: "0.625rem 0.75rem",
                      borderRadius: "0.375rem",
                      border: "1px solid #d1d5db",
                      fontSize: "0.875rem",
                      color: "#1f2937",
                      backgroundColor: "#f9fafb",
                    }}
                  />
                </div>

                {/* Invoice Number Field */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "0.375rem",
                    }}
                  >
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    value={potentialDuplicate.invoiceNumber || ""}
                    readOnly
                    style={{
                      width: "100%",
                      padding: "0.625rem 0.75rem",
                      borderRadius: "0.375rem",
                      border: "1px solid #d1d5db",
                      fontSize: "0.875rem",
                      color: "#1f2937",
                      backgroundColor: "#f9fafb",
                    }}
                  />
                </div>

                {/* Product Field */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "0.375rem",
                    }}
                  >
                    Product
                  </label>
                  <input
                    type="text"
                    value={
                      potentialDuplicate.product
                        ? `${potentialDuplicate.product.technicalName || ""} (${
                            potentialDuplicate.product.commonName || ""
                          })`
                        : ""
                    }
                    readOnly
                    style={{
                      width: "100%",
                      padding: "0.625rem 0.75rem",
                      borderRadius: "0.375rem",
                      border: "1px solid #d1d5db",
                      fontSize: "0.875rem",
                      color: "#1f2937",
                      backgroundColor: "#f9fafb",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                  marginTop: "1.5rem",
                  paddingTop: "1.5rem",
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                <button
                  onClick={() => cancelDuplicate()}
                  style={{
                    padding: "0.625rem 1.25rem",
                    backgroundColor: "#f3f4f6",
                    color: "#374151",
                    border: "none",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.backgroundColor = "#e5e7eb")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.backgroundColor = "#f3f4f6")
                  }
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmDuplicate()}
                  style={{
                    padding: "0.625rem 1.25rem",
                    backgroundColor: "#f97316",
                    color: "white",
                    border: "none",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.backgroundColor = "#ea580c")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.backgroundColor = "#f97316")
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    style={{ height: "1rem", width: "1rem" }}
                  >
                    <path
                      fillRule="evenodd"
                      d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Save Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .tab-button {
          position: relative;
          border-bottom: none !important;
        }

        .tab-button.active-tab::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background-color: var(--primary, #ff4040);
        }
      `}</style>
    </div>
  );
}
