"use client";
import { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  query,
  orderBy,
  where,
  limit,
  Timestamp,
  startAt,
  endAt,
} from "firebase/firestore";
import app from "@/firebase/config";
import AppIcons from "@/components/AppIcons";

const db = getFirestore(app);

const Summary = () => {
  const { products, companyId } = useAppContext();
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stockSummary, setStockSummary] = useState({
    total: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
  });

  // Search and display state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Monthly insights state
  const [monthlyInsights, setMonthlyInsights] = useState({
    dispatch: [],
    production: [],
    incoming: [],
    loading: true,
    error: null,
  });

  // Get current month date range (first day to last day)
  const getCurrentMonthRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    return {
      start: firstDay,
      end: lastDay,
    };
  };

  const fetchProductStock = async () => {
    if (!companyId) return;

    setLoading(true);
    setError(null);

    try {
      const companyRef = doc(db, "companies", companyId);
      const stockCollectionRef = collection(companyRef, "productStock");
      const stockQuery = query(
        stockCollectionRef,
        orderBy("lastUpdated", "desc")
      );

      const querySnapshot = await getDocs(stockQuery);

      // Create a map of product stocks
      const stockMap = {};
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        stockMap[data.productId] = {
          availableQuantity: data.availableQuantity || 0,
          lastUpdated: data.lastUpdated?.toDate() || new Date(),
        };
      });

      // Combine products with their stock data
      const combinedData = products.map((product) => ({
        ...product,
        stock: stockMap[product.id] || {
          availableQuantity: 0,
          lastUpdated: new Date(),
        },
      }));

      setStockData(combinedData);

      // Calculate summary statistics
      const summary = {
        total: combinedData.length,
        inStock: 0,
        lowStock: 0,
        outOfStock: 0,
      };

      combinedData.forEach((product) => {
        const qty = product.stock.availableQuantity;
        if (qty <= 0) {
          summary.outOfStock++;
        } else if (qty < 5) {
          summary.lowStock++;
        } else {
          summary.inStock++;
        }
      });

      setStockSummary(summary);
    } catch (err) {
      console.error("Error fetching product stock:", err);
      setError("Failed to load stock data");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Handle product search
  useEffect(() => {
    if (searchTerm.trim() === "") {
      // Show all products in alphabetical order when search box is focused but empty
      if (isSearchFocused) {
        const sortedProducts = [...stockData].sort((a, b) => {
          const nameA = (a.technicalName || "").toLowerCase();
          const nameB = (b.technicalName || "").toLowerCase();
          return nameA.localeCompare(nameB);
        });
        setFilteredProducts(sortedProducts);
      } else {
        setFilteredProducts([]);
      }
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = stockData
      .filter((product) => {
        return (
          (product.technicalName &&
            product.technicalName.toLowerCase().includes(term)) ||
          (product.commonName &&
            product.commonName.toLowerCase().includes(term))
        );
      })
      .sort((a, b) => {
        const nameA = (a.technicalName || "").toLowerCase();
        const nameB = (b.technicalName || "").toLowerCase();
        return nameA.localeCompare(nameB);
      })
      .slice(0, 15); // Limit to 15 results for performance

    setFilteredProducts(filtered);
  }, [searchTerm, stockData, isSearchFocused]);

  // Clear search when "Show All" is clicked
  useEffect(() => {
    if (showAllProducts) {
      setSearchTerm("");
      setSelectedProduct(null);
    }
  }, [showAllProducts]);

  // Fetch monthly dispatch insights
  const fetchMonthlyDispatch = async () => {
    if (!companyId) return [];

    try {
      const dateRange = getCurrentMonthRange();
      const companyRef = doc(db, "companies", companyId);
      const dispatchCollectionRef = collection(companyRef, "dispatchEntries");

      // Query dispatch entries for current month
      const dispatchQuery = query(
        dispatchCollectionRef,
        where("date", ">=", Timestamp.fromDate(dateRange.start)),
        where("date", "<=", Timestamp.fromDate(dateRange.end)),
        orderBy("date", "desc")
      );

      const snapshot = await getDocs(dispatchQuery);

      // Process and aggregate data by product
      const productMap = {};

      snapshot.forEach((doc) => {
        const data = doc.data();
        const productId = data.product?.id;

        if (productId) {
          if (!productMap[productId]) {
            productMap[productId] = {
              productId,
              productName: data.product.technicalName || "Unknown",
              productCommonName: data.product.commonName || "",
              totalQuantity: 0,
            };
          }

          productMap[productId].totalQuantity += parseFloat(data.quantity) || 0;
        }
      });

      // Convert to array and sort by quantity
      return Object.values(productMap)
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 5); // Top 5 products
    } catch (err) {
      console.error("Error fetching monthly dispatch:", err);
      return [];
    }
  };

  // Fetch monthly production insights
  const fetchMonthlyProduction = async () => {
    if (!companyId) return [];

    try {
      const dateRange = getCurrentMonthRange();
      const companyRef = doc(db, "companies", companyId);
      const productionCollectionRef = collection(
        companyRef,
        "productionEntries"
      );

      // Query production entries for current month
      const productionQuery = query(
        productionCollectionRef,
        where("date", ">=", Timestamp.fromDate(dateRange.start)),
        where("date", "<=", Timestamp.fromDate(dateRange.end)),
        orderBy("date", "desc")
      );

      const snapshot = await getDocs(productionQuery);

      // Process and aggregate data by product and machine
      const productMachineMap = {};

      snapshot.forEach((doc) => {
        const data = doc.data();
        const productId = data.product?.id;
        const machineId = data.machine?.id;

        if (productId && machineId) {
          const key = `${productId}-${machineId}`;

          if (!productMachineMap[key]) {
            productMachineMap[key] = {
              productId,
              productName: data.product.technicalName || "Unknown",
              productCommonName: data.product.commonName || "",
              machineId,
              machineName: data.machine.name || "Unknown",
              totalQuantity: 0,
            };
          }

          productMachineMap[key].totalQuantity +=
            parseFloat(data.quantity) || 0;
        }
      });

      // Convert to array and sort by quantity
      return Object.values(productMachineMap)
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 5); // Top 5 product-machine combinations
    } catch (err) {
      console.error("Error fetching monthly production:", err);
      return [];
    }
  };

  // Fetch monthly incoming insights
  const fetchMonthlyIncoming = async () => {
    if (!companyId) return [];

    try {
      const dateRange = getCurrentMonthRange();
      const companyRef = doc(db, "companies", companyId);
      const incomingCollectionRef = collection(companyRef, "incomingEntries");

      // Query incoming entries for current month
      const incomingQuery = query(
        incomingCollectionRef,
        where("date", ">=", Timestamp.fromDate(dateRange.start)),
        where("date", "<=", Timestamp.fromDate(dateRange.end)),
        orderBy("date", "desc")
      );

      const snapshot = await getDocs(incomingQuery);

      // Process and aggregate data by product
      const productMap = {};

      snapshot.forEach((doc) => {
        const data = doc.data();
        const productId = data.product?.id;

        if (productId) {
          if (!productMap[productId]) {
            productMap[productId] = {
              productId,
              productName: data.product.technicalName || "Unknown",
              productCommonName: data.product.commonName || "",
              totalQuantity: 0,
            };
          }

          productMap[productId].totalQuantity += parseFloat(data.quantity) || 0;
        }
      });

      // Convert to array and sort by quantity
      return Object.values(productMap)
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 5); // Top 5 products
    } catch (err) {
      console.error("Error fetching monthly incoming:", err);
      return [];
    }
  };

  // Fetch all monthly insights
  const fetchAllMonthlyInsights = async () => {
    setMonthlyInsights((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const [dispatchData, productionData, incomingData] = await Promise.all([
        fetchMonthlyDispatch(),
        fetchMonthlyProduction(),
        fetchMonthlyIncoming(),
      ]);

      setMonthlyInsights({
        dispatch: dispatchData,
        production: productionData,
        incoming: incomingData,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error("Error fetching monthly insights:", err);
      setMonthlyInsights((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to load monthly insights",
      }));
    }
  };

  useEffect(() => {
    fetchProductStock();
    fetchAllMonthlyInsights();
  }, [companyId, products]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchProductStock();
    fetchAllMonthlyInsights();
  };

  // Format date to a readable format
  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(date);
  };

  // Format quantity with 2 decimal places
  const formatQuantity = (quantity) => {
    return parseFloat(quantity).toFixed(2);
  };

  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel-header" style={{ display: "none" }}>
        <div className="panel-title">Stock Inventory & Monthly Insights</div>
        <button
          className="refresh-button"
          onClick={handleRefresh}
          disabled={loading || isRefreshing}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`refresh-icon ${isRefreshing ? "spinning" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="dashboard-panel-content">
        {/* Stock Summary Cards */}
        {!loading && !error && (
          <div className="summary-cards">
            <div className="summary-card total">
              <div className="card-icon">
                <AppIcons.Box />
              </div>
              <div className="card-content">
                <div className="card-value">{stockSummary.total}</div>
                <div className="card-label">Total Products</div>
              </div>
            </div>

            <div className="summary-card in-stock-card">
              <div className="card-icon">
                <AppIcons.Success />
              </div>
              <div className="card-content">
                <div className="card-value">{stockSummary.inStock}</div>
                <div className="card-label">In Stock</div>
              </div>
            </div>

            <div className="summary-card low-stock-card">
              <div className="card-icon">
                <AppIcons.Refresh />
              </div>
              <div className="card-content">
                <div className="card-value">{stockSummary.lowStock}</div>
                <div className="card-label">Low Stock</div>
              </div>
            </div>

            <div className="summary-card out-of-stock-card">
              <div className="card-icon">
                <AppIcons.Error />
              </div>
              <div className="card-content">
                <div className="card-value">{stockSummary.outOfStock}</div>
                <div className="card-label">Out of Stock</div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <span>Loading stock data...</span>
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
        ) : stockData.length === 0 ? (
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
            <span>No product stock data available</span>
          </div>
        ) : (
          <div className="stock-table-section">
            {/* Product Search */}
            <div className="search-container">
              <div className="search-input-wrapper">
                <div className="search-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search for a product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => {
                    // Delay hiding the dropdown to allow for item selection
                    setTimeout(() => setIsSearchFocused(false), 200);
                  }}
                />
                {searchTerm && (
                  <button
                    className="clear-search"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedProduct(null);
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                )}
              </div>

              {isSearchFocused && filteredProducts.length > 0 && (
                <div className="search-results">
                  {!searchTerm && (
                    <div className="search-results-header">All Products</div>
                  )}
                  {searchTerm && filteredProducts.length > 0 && (
                    <div className="search-results-count">
                      {filteredProducts.length} products found
                    </div>
                  )}
                  <ul>
                    {filteredProducts.map((product) => (
                      <li
                        key={product.id}
                        onClick={() => {
                          setSelectedProduct(product);
                          setSearchTerm(
                            `${product.technicalName} (${
                              product.commonName || ""
                            })`
                          );
                          setIsSearchFocused(false);
                        }}
                      >
                        <div className="product-name">
                          {product.technicalName} |{" "}
                          <span className="product-common-name">
                            {product.commonName}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                className="show-all-button"
                onClick={() => setShowAllProducts(!showAllProducts)}
              >
                {showAllProducts ? "Hide All" : "Show All Products"}
              </button>
            </div>

            {/* Stock Table */}
            {(selectedProduct || showAllProducts) && (
              <div className="stock-table-container">
                <table className="stock-table">
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Common Name</th>
                      <th>Available Quantity (MT)</th>
                      <th>Last Updated</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProduct && !showAllProducts ? (
                      <tr key={selectedProduct.id}>
                        <td>{selectedProduct.technicalName || "—"}</td>
                        <td>{selectedProduct.commonName || "—"}</td>
                        <td className="quantity-cell">
                          {selectedProduct.stock.availableQuantity.toFixed(2)}
                        </td>
                        <td>{formatDate(selectedProduct.stock.lastUpdated)}</td>
                        <td>
                          <div
                            className={`stock-status ${
                              selectedProduct.stock.availableQuantity <= 0
                                ? "out-of-stock"
                                : selectedProduct.stock.availableQuantity < 5
                                ? "low-stock"
                                : "in-stock"
                            }`}
                          >
                            {selectedProduct.stock.availableQuantity <= 0
                              ? "Out of Stock"
                              : selectedProduct.stock.availableQuantity < 5
                              ? "Low Stock"
                              : "In Stock"}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      showAllProducts &&
                      stockData.map((product) => (
                        <tr key={product.id}>
                          <td>{product.technicalName || "—"}</td>
                          <td>{product.commonName || "—"}</td>
                          <td className="quantity-cell">
                            {product.stock.availableQuantity.toFixed(2)}
                          </td>
                          <td>{formatDate(product.stock.lastUpdated)}</td>
                          <td>
                            <div
                              className={`stock-status ${
                                product.stock.availableQuantity <= 0
                                  ? "out-of-stock"
                                  : product.stock.availableQuantity < 5
                                  ? "low-stock"
                                  : "in-stock"
                              }`}
                            >
                              {product.stock.availableQuantity <= 0
                                ? "Out of Stock"
                                : product.stock.availableQuantity < 5
                                ? "Low Stock"
                                : "In Stock"}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Monthly Insights Section */}
        <div className="monthly-insights-section">
          <h3 className="section-title">
            Monthly Insights{" "}
            <span className="current-month">
              (
              {new Date().toLocaleString("default", {
                month: "long",
                year: "numeric",
              })}
              )
            </span>
          </h3>

          {monthlyInsights.loading ? (
            <div className="insights-loading">
              <div className="loading-spinner small"></div>
              <span>Loading monthly insights...</span>
            </div>
          ) : monthlyInsights.error ? (
            <div className="insights-error">
              <span>{monthlyInsights.error}</span>
            </div>
          ) : (
            <div className="insights-grid">
              {/* Incoming Insights */}
              <div className="insight-card">
                <div className="insight-header">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="insight-icon dispatch-icon"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="8 12 12 16 16 12"></polyline>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                  </svg>
                  <h4>Incoming</h4>
                </div>

                {monthlyInsights.incoming.length === 0 ? (
                  <div className="no-data">No incoming data this month</div>
                ) : (
                  <ul className="insight-list">
                    {monthlyInsights.incoming.map((item, index) => (
                      <li
                        key={`incoming-${item.productId}-${index}`}
                        className="insight-item"
                      >
                        <div className="item-name">{item.productName}</div>
                        <div className="item-details">
                          <span className="item-quantity">
                            {formatQuantity(item.totalQuantity)} MT
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Production Insights */}
              <div className="insight-card">
                <div className="insight-header">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="insight-icon production-icon"
                  >
                    <path d="M2 22h20"></path>
                    <path d="M7 8h10"></path>
                    <path d="M12 2v6"></path>
                    <path d="M17 17v-7"></path>
                    <path d="M7 17v-7"></path>
                    <path d="M17 8a5 5 0 0 0-10 0"></path>
                  </svg>
                  <h4>Production</h4>
                </div>

                {monthlyInsights.production.length === 0 ? (
                  <div className="no-data">No production data this month</div>
                ) : (
                  <ul className="insight-list">
                    {monthlyInsights.production.map((item, index) => (
                      <li
                        key={`prod-${item.productId}-${item.machineId}-${index}`}
                        className="insight-item"
                      >
                        <div className="item-name">{item.productName}</div>
                        <div className="item-details">
                          <span className="item-machine">
                            {item.machineName}
                          </span>
                          <span className="item-quantity">
                            {formatQuantity(item.totalQuantity)} MT
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Dispatch Insights */}
              <div className="insight-card">
                <div className="insight-header">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="insight-icon incoming-icon"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="16 12 12 8 8 12"></polyline>
                    <line x1="12" y1="16" x2="12" y2="8"></line>
                  </svg>
                  <h4>Dispatch</h4>
                </div>

                {monthlyInsights.dispatch.length === 0 ? (
                  <div className="no-data">No dispatch data this month</div>
                ) : (
                  <ul className="insight-list">
                    {monthlyInsights.dispatch.map((item, index) => (
                      <li
                        key={`dispatch-${item.productId}-${index}`}
                        className="insight-item"
                      >
                        <div className="item-name">{item.productName}</div>
                        <div className="item-details">
                          <span className="item-quantity">
                            {formatQuantity(item.totalQuantity)} MT
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
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

        .dashboard-panel-content {
          // padding: 1.5rem;
        }

        /* Summary Cards */
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .summary-card {
          display: flex;
          align-items: center;
          padding: 1.25rem;
          border-radius: 0.5rem;
          background-color: white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .card-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 3rem;
          height: 3rem;
          border-radius: 0.5rem;
          margin-right: 1rem;
          flex-shrink: 0;
        }

        .card-icon svg {
          width: 1.5rem;
          height: 1.5rem;
        }

        .card-content {
          flex: 1;
        }

        .card-value {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
          line-height: 1;
        }

        .card-label {
          font-size: 0.875rem;
          color: #6b7280;
        }

        /* Card Colors */
        .total .card-icon {
          background-color: #eff6ff;
          color: #3b82f6;
        }

        .total .card-value {
          color: #1f2937;
        }

        .in-stock-card .card-icon {
          background-color: #d1fae5;
          color: #059669;
        }

        .in-stock-card .card-value {
          color: #065f46;
        }

        .low-stock-card .card-icon {
          background-color: #fef3c7;
          color: #d97706;
        }

        .low-stock-card .card-value {
          color: #92400e;
        }

        .out-of-stock-card .card-icon {
          background-color: #fee2e2;
          color: #dc2626;
        }

        .out-of-stock-card .card-value {
          color: #b91c1c;
        }

        .loading-state,
        .error-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1.5rem;
          text-align: center;
          color: #6b7280;
        }

        .loading-spinner {
          border: 3px solid #e5e7eb;
          border-radius: 50%;
          border-top: 3px solid #4f46e5;
          width: 2rem;
          height: 2rem;
          animation: spin 1s linear infinite;
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
          color: #9ca3af;
        }

        .stock-table-section {
          margin-bottom: 2rem;
        }

        .search-container {
          position: relative;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
        }

        .search-icon {
          width: 1rem;
          height: 1rem;
          margin-right: 0.5rem;
        }

        .search-input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 0.875rem;
        }

        .clear-search {
          background: none;
          border: none;
          padding: 0;
          margin-left: 0.5rem;
          cursor: pointer;
        }

        .search-results {
          position: absolute;
          top: 100%;
          left: 0;
          width: 100%;
          max-height: 300px;
          overflow-y: auto;
          background-color: white;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 2px 4px -1px rgba(0, 0, 0, 0.06);
          z-index: 10;
          border: 1px solid #e5e7eb;
          margin-top: 0.25rem;
        }

        .search-results-header,
        .search-results-count {
          padding: 0.5rem 1rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          background-color: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .search-results-count {
          color: #4f46e5;
        }

        .search-results ul {
          list-style-type: none;
          padding: 0;
          margin: 0;
        }

        .show-all-button {
          background: none;
          border: none;
          padding: 0;
          margin-left: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
          color: #4f46e5;
        }

        .stock-table-container {
          overflow-x: auto;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
        }

        .stock-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .stock-table th {
          background-color: #f9fafb;
          padding: 0.75rem 1rem;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
          white-space: nowrap;
        }

        .stock-table td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #e5e7eb;
          color: #4b5563;
        }

        .stock-table tr:last-child td {
          border-bottom: none;
        }

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

        .quantity-cell {
          font-weight: 600;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        /* Monthly Insights Section */
        .monthly-insights-section {
          margin-bottom: 0;
          padding-top: 2rem;
          margin-top: 2rem;
          border-top: 1px solid #e5e7eb;
          border-bottom: none;
        }

        .section-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 1.25rem;
          display: flex;
          align-items: center;
        }

        .current-month {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 400;
          margin-left: 0.5rem;
        }

        .insights-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.25rem;
        }

        .insight-card {
          background-color: white;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .insight-header {
          padding: 0.75rem 1rem;
          background-color: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .insight-header h4 {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin: 0;
        }

        .insight-icon {
          width: 1.25rem;
          height: 1.25rem;
        }

        .dispatch-icon {
          color: #4f46e5;
        }

        .production-icon {
          color: #059669;
        }

        .incoming-icon {
          color: #d97706;
        }

        .insight-list {
          list-style: none;
          margin: 0;
          padding: 0.5rem 0;
        }

        .insight-item {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #f3f4f6;
        }

        .insight-item:last-child {
          border-bottom: none;
        }

        .item-name {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.25rem;
        }

        .item-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.95rem;
          color: #6b7280;
        }

        .item-machine {
          background-color: #f3f4f6;
          padding: 0.125rem 0.375rem;
          border-radius: 9999px;
          font-size: 0.75rem;
        }

        .item-quantity {
          font-weight: 600;
          color: #1f2937;
        }

        .insights-loading,
        .insights-error,
        .no-data {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          text-align: center;
          font-size: 0.875rem;
        }

        .insights-loading {
          gap: 0.75rem;
        }

        .loading-spinner.small {
          width: 1.25rem;
          height: 1.25rem;
          border-width: 2px;
          margin-bottom: 0;
        }

        /* Search Styles */
        .stock-table-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .search-container {
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
          margin-bottom: 0.5rem;
        }

        .search-input-wrapper {
          flex: 1;
          position: relative;
          max-width: 600px;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #6b7280;
          width: 1.25rem;
          height: 1.25rem;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.75rem;
          border-radius: 0.5rem;
          border: 1px solid #d1d5db;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .search-input:focus {
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .clear-search {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: #6b7280;
          background: transparent;
          border: none;
          padding: 0.25rem;
          cursor: pointer;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .clear-search svg {
          width: 1rem;
          height: 1rem;
        }

        .clear-search:hover {
          color: #4b5563;
          background-color: #f3f4f6;
        }

        .search-results {
          position: absolute;
          top: 100%;
          left: 0;
          width: 100%;
          max-height: 300px;
          overflow-y: auto;
          background-color: white;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 2px 4px -1px rgba(0, 0, 0, 0.06);
          z-index: 10;
          border: 1px solid #e5e7eb;
          margin-top: 0.25rem;
        }

        .search-results ul {
          list-style-type: none;
          padding: 0;
          margin: 0;
        }

        .search-results li {
          padding: 0.75rem 1rem;
          cursor: pointer;
          border-bottom: 1px solid #f3f4f6;
          transition: background-color 0.2s;
        }

        .search-results li:last-child {
          border-bottom: none;
        }

        .search-results li:hover {
          background-color: #f9fafb;
        }

        .product-name {
          font-weight: 500;
          color: #1f2937;
        }

        .product-common-name {
          color: #6b7280;
          margin-top: 0.25rem;
        }

        .show-all-button {
          padding: 0.75rem 1.25rem;
          background-color: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .show-all-button:hover {
          background-color: #e5e7eb;
        }
      `}</style>
    </div>
  );
};

export default Summary;
