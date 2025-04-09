import React, { useState, useEffect } from "react";
import styles from "./Admin.module.css";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDocs,
  orderBy,
  query,
  deleteDoc,
} from "firebase/firestore";
import app from "../../../../firebase/config";
import { useAppContext } from "../../../../context/AppContext";
import { useNotification } from "../../../../context/NotificationContext";

const db = getFirestore(app);

// Trash icon SVG component
const TrashIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={styles["trash-icon"]}
      viewBox="0 0 24 24"
    >
      <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2m-6 5v6m4-6v6" />
    </svg>
  );
};

const Admin = () => {
  const [activeTab, setActiveTab] = useState("products");

  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel-header">
        <div className="panel-title">Admin Panel</div>
      </div>

      <div className={styles["admin-tabs"]}>
        <button
          className={`${styles["tab-button"]} ${
            activeTab === "products" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("products")}
        >
          Products
        </button>
        <button
          className={`${styles["tab-button"]} ${
            activeTab === "machines" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("machines")}
        >
          Machines
        </button>
        <button
          className={`${styles["tab-button"]} ${
            activeTab === "suppliers" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("suppliers")}
        >
          Suppliers
        </button>
        <button
          className={`${styles["tab-button"]} ${
            activeTab === "buyers" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("buyers")}
        >
          Buyers
        </button>
        <button
          className={`${styles["tab-button"]} ${
            activeTab === "bagTypes" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("bagTypes")}
        >
          Bag Types
        </button>
      </div>

      <div className={styles["admin-content"]}>
        {activeTab === "products" && <ProductsForm />}
        {activeTab === "machines" && <MachinesForm />}
        {activeTab === "suppliers" && <SuppliersForm />}
        {activeTab === "buyers" && <BuyersForm />}
        {activeTab === "bagTypes" && <BagTypesForm />}
      </div>
    </div>
  );
};

const ProductsForm = () => {
  const { companyId } = useAppContext();
  const { showSuccess, showError } = useNotification();
  const [technicalName, setTechnicalName] = useState("");
  const [commonName, setCommonName] = useState("");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState(null);

  // Fetch products data
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const companyRef = doc(db, "companies", companyId);
        const productsCollectionRef = collection(companyRef, "products");
        const productsQuery = query(
          productsCollectionRef,
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(productsQuery);

        const productsData = [];
        querySnapshot.forEach((doc) => {
          productsData.push({ id: doc.id, ...doc.data() });
        });

        setProducts(productsData);
      } catch (err) {
        console.error("Error fetching products:", err);
        showError("Failed to fetch products");
      }
    };

    if (companyId) {
      fetchProducts();
    }
  }, [companyId, refreshTrigger, showError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const companyRef = doc(db, "companies", companyId);
      const productsCollectionRef = collection(companyRef, "products");

      await addDoc(productsCollectionRef, {
        technicalName,
        commonName,
        createdAt: new Date(),
      });

      console.log("Product added:", { technicalName, commonName });
      setTechnicalName("");
      setCommonName("");
      showSuccess("Product added successfully!");
      setRefreshTrigger((prev) => prev + 1); // Trigger a refresh of the products list
    } catch (err) {
      console.error("Error adding product:", err);
      showError("Failed to add product. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }

    setDeleteLoading(productId);
    try {
      const companyRef = doc(db, "companies", companyId);
      const productDocRef = doc(companyRef, "products", productId);
      await deleteDoc(productDocRef);

      showSuccess("Product deleted successfully!");
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("Error deleting product:", err);
      showError("Failed to delete product. Please try again.");
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <div className={styles["two-column-layout"]}>
      <div className={styles["list-container"]}>
        <div className={styles["list-container-header"]}>
          <div className={styles["list-container-title"]}>
            Products
            <span className={styles["list-count"]}>{products.length}</span>
          </div>
        </div>

        {products.length === 0 ? (
          <p className={styles["no-items"]}>No products added yet</p>
        ) : (
          <ul className={styles["items-list"]}>
            {products.map((product) => (
              <li key={product.id} className={styles["list-item"]}>
                <div className={styles["item-content"]}>
                  <div className={styles["item-name"]}>
                    {product.technicalName}
                  </div>
                  <div className={styles["item-details"]}>
                    {product.commonName}
                  </div>
                </div>
                <button
                  className={styles["delete-button"]}
                  onClick={() => handleDelete(product.id)}
                  disabled={deleteLoading === product.id}
                  title="Delete product"
                >
                  {deleteLoading === product.id ? (
                    <div className="loading-spinner-small"></div>
                  ) : (
                    <TrashIcon />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles["form-container"]}>
        <h2>Add New Product</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles["form-group"]}>
            <label htmlFor="technicalName">Technical Name:</label>
            <input
              type="text"
              id="technicalName"
              value={technicalName}
              onChange={(e) => setTechnicalName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className={styles["form-group"]}>
            <label htmlFor="commonName">Common Name:</label>
            <input
              type="text"
              id="commonName"
              value={commonName}
              onChange={(e) => setCommonName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            className={styles["submit-button"]}
            disabled={loading}
          >
            {loading ? "Adding..." : "Add Product"}
          </button>
        </form>
      </div>
    </div>
  );
};

const MachinesForm = () => {
  const { companyId } = useAppContext();
  const { showSuccess, showError } = useNotification();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [machines, setMachines] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState(null);

  // Fetch machines data
  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const companyRef = doc(db, "companies", companyId);
        const machinesCollectionRef = collection(companyRef, "machines");
        const machinesQuery = query(
          machinesCollectionRef,
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(machinesQuery);

        const machinesData = [];
        querySnapshot.forEach((doc) => {
          machinesData.push({ id: doc.id, ...doc.data() });
        });

        setMachines(machinesData);
      } catch (err) {
        console.error("Error fetching machines:", err);
        showError("Failed to fetch machines");
      }
    };

    if (companyId) {
      fetchMachines();
    }
  }, [companyId, refreshTrigger, showError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const companyRef = doc(db, "companies", companyId);
      const machinesCollectionRef = collection(companyRef, "machines");

      await addDoc(machinesCollectionRef, {
        name,
        createdAt: new Date(),
      });

      console.log("Machine added:", { name });
      setName("");
      showSuccess("Machine added successfully!");
      setRefreshTrigger((prev) => prev + 1); // Trigger a refresh of the machines list
    } catch (err) {
      console.error("Error adding machine:", err);
      showError("Failed to add machine. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (machineId) => {
    if (!window.confirm("Are you sure you want to delete this machine?")) {
      return;
    }

    setDeleteLoading(machineId);
    try {
      const companyRef = doc(db, "companies", companyId);
      const machineDocRef = doc(companyRef, "machines", machineId);
      await deleteDoc(machineDocRef);

      showSuccess("Machine deleted successfully!");
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("Error deleting machine:", err);
      showError("Failed to delete machine. Please try again.");
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <div className={styles["two-column-layout"]}>
      <div className={styles["list-container"]}>
        <div className={styles["list-container-header"]}>
          <div className={styles["list-container-title"]}>
            Machines
            <span className={styles["list-count"]}>{machines.length}</span>
          </div>
        </div>

        {machines.length === 0 ? (
          <p className={styles["no-items"]}>No machines added yet</p>
        ) : (
          <ul className={styles["items-list"]}>
            {machines.map((machine) => (
              <li key={machine.id} className={styles["list-item"]}>
                <div className={styles["item-content"]}>
                  <div className={styles["item-name"]}>{machine.name}</div>
                </div>
                <button
                  className={styles["delete-button"]}
                  onClick={() => handleDelete(machine.id)}
                  disabled={deleteLoading === machine.id}
                  title="Delete machine"
                >
                  {deleteLoading === machine.id ? (
                    <div className="loading-spinner-small"></div>
                  ) : (
                    <TrashIcon />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles["form-container"]}>
        <h2>Add New Machine</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles["form-group"]}>
            <label htmlFor="machineName">Machine Name:</label>
            <input
              type="text"
              id="machineName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            className={styles["submit-button"]}
            disabled={loading}
          >
            {loading ? "Adding..." : "Add Machine"}
          </button>
        </form>
      </div>
    </div>
  );
};

const SuppliersForm = () => {
  const { companyId } = useAppContext();
  const { showSuccess, showError } = useNotification();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState(null);

  // Fetch suppliers data
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const companyRef = doc(db, "companies", companyId);
        const suppliersCollectionRef = collection(companyRef, "suppliers");
        const suppliersQuery = query(
          suppliersCollectionRef,
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(suppliersQuery);

        const suppliersData = [];
        querySnapshot.forEach((doc) => {
          suppliersData.push({ id: doc.id, ...doc.data() });
        });

        setSuppliers(suppliersData);
      } catch (err) {
        console.error("Error fetching suppliers:", err);
        showError("Failed to fetch suppliers");
      }
    };

    if (companyId) {
      fetchSuppliers();
    }
  }, [companyId, refreshTrigger, showError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const companyRef = doc(db, "companies", companyId);
      const suppliersCollectionRef = collection(companyRef, "suppliers");

      await addDoc(suppliersCollectionRef, {
        name,
        createdAt: new Date(),
      });

      console.log("Supplier added:", { name });
      setName("");
      showSuccess("Supplier added successfully!");
      setRefreshTrigger((prev) => prev + 1); // Trigger a refresh of the suppliers list
    } catch (err) {
      console.error("Error adding supplier:", err);
      showError("Failed to add supplier. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (supplierId) => {
    if (!window.confirm("Are you sure you want to delete this supplier?")) {
      return;
    }

    setDeleteLoading(supplierId);
    try {
      const companyRef = doc(db, "companies", companyId);
      const supplierDocRef = doc(companyRef, "suppliers", supplierId);
      await deleteDoc(supplierDocRef);

      showSuccess("Supplier deleted successfully!");
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("Error deleting supplier:", err);
      showError("Failed to delete supplier. Please try again.");
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <div className={styles["two-column-layout"]}>
      <div className={styles["list-container"]}>
        <div className={styles["list-container-header"]}>
          <div className={styles["list-container-title"]}>
            Suppliers
            <span className={styles["list-count"]}>{suppliers.length}</span>
          </div>
        </div>

        {suppliers.length === 0 ? (
          <p className={styles["no-items"]}>No suppliers added yet</p>
        ) : (
          <ul className={styles["items-list"]}>
            {suppliers.map((supplier) => (
              <li key={supplier.id} className={styles["list-item"]}>
                <div className={styles["item-content"]}>
                  <div className={styles["item-name"]}>{supplier.name}</div>
                </div>
                <button
                  className={styles["delete-button"]}
                  onClick={() => handleDelete(supplier.id)}
                  disabled={deleteLoading === supplier.id}
                  title="Delete supplier"
                >
                  {deleteLoading === supplier.id ? (
                    <div className="loading-spinner-small"></div>
                  ) : (
                    <TrashIcon />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles["form-container"]}>
        <h2>Add New Supplier</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles["form-group"]}>
            <label htmlFor="supplierName">Supplier Name:</label>
            <input
              type="text"
              id="supplierName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            className={styles["submit-button"]}
            disabled={loading}
          >
            {loading ? "Adding..." : "Add Supplier"}
          </button>
        </form>
      </div>
    </div>
  );
};

const BuyersForm = () => {
  const { companyId } = useAppContext();
  const { showSuccess, showError } = useNotification();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [buyers, setBuyers] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState(null);

  // Fetch buyers data
  useEffect(() => {
    const fetchBuyers = async () => {
      try {
        const companyRef = doc(db, "companies", companyId);
        const buyersCollectionRef = collection(companyRef, "buyers");
        const buyersQuery = query(
          buyersCollectionRef,
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(buyersQuery);

        const buyersData = [];
        querySnapshot.forEach((doc) => {
          buyersData.push({ id: doc.id, ...doc.data() });
        });

        setBuyers(buyersData);
      } catch (err) {
        console.error("Error fetching buyers:", err);
        showError("Failed to fetch buyers");
      }
    };

    if (companyId) {
      fetchBuyers();
    }
  }, [companyId, refreshTrigger, showError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const companyRef = doc(db, "companies", companyId);
      const buyersCollectionRef = collection(companyRef, "buyers");

      await addDoc(buyersCollectionRef, {
        name,
        createdAt: new Date(),
      });

      console.log("Buyer added:", { name });
      setName("");
      showSuccess("Buyer added successfully!");
      setRefreshTrigger((prev) => prev + 1); // Trigger a refresh of the buyers list
    } catch (err) {
      console.error("Error adding buyer:", err);
      showError("Failed to add buyer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (buyerId) => {
    if (!window.confirm("Are you sure you want to delete this buyer?")) {
      return;
    }

    setDeleteLoading(buyerId);
    try {
      const companyRef = doc(db, "companies", companyId);
      const buyerDocRef = doc(companyRef, "buyers", buyerId);
      await deleteDoc(buyerDocRef);

      showSuccess("Buyer deleted successfully!");
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("Error deleting buyer:", err);
      showError("Failed to delete buyer. Please try again.");
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <div className={styles["two-column-layout"]}>
      <div className={styles["list-container"]}>
        <div className={styles["list-container-header"]}>
          <div className={styles["list-container-title"]}>
            Buyers
            <span className={styles["list-count"]}>{buyers.length}</span>
          </div>
        </div>

        {buyers.length === 0 ? (
          <p className={styles["no-items"]}>No buyers added yet</p>
        ) : (
          <ul className={styles["items-list"]}>
            {buyers.map((buyer) => (
              <li key={buyer.id} className={styles["list-item"]}>
                <div className={styles["item-content"]}>
                  <div className={styles["item-name"]}>{buyer.name}</div>
                </div>
                <button
                  className={styles["delete-button"]}
                  onClick={() => handleDelete(buyer.id)}
                  disabled={deleteLoading === buyer.id}
                  title="Delete buyer"
                >
                  {deleteLoading === buyer.id ? (
                    <div className="loading-spinner-small"></div>
                  ) : (
                    <TrashIcon />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles["form-container"]}>
        <h2>Add New Buyer</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles["form-group"]}>
            <label htmlFor="buyerName">Buyer Name:</label>
            <input
              type="text"
              id="buyerName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            className={styles["submit-button"]}
            disabled={loading}
          >
            {loading ? "Adding..." : "Add Buyer"}
          </button>
        </form>
      </div>
    </div>
  );
};

const BagTypesForm = () => {
  const { companyId } = useAppContext();
  const { showSuccess, showError } = useNotification();
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [loading, setLoading] = useState(false);
  const [bagTypes, setBagTypes] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState(null);

  // Fetch bag types data
  useEffect(() => {
    const fetchBagTypes = async () => {
      try {
        const companyRef = doc(db, "companies", companyId);
        const bagTypesCollectionRef = collection(companyRef, "bagTypes");
        const bagTypesQuery = query(
          bagTypesCollectionRef,
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(bagTypesQuery);

        const bagTypesData = [];
        querySnapshot.forEach((doc) => {
          bagTypesData.push({ id: doc.id, ...doc.data() });
        });

        setBagTypes(bagTypesData);
      } catch (err) {
        console.error("Error fetching bag types:", err);
        showError("Failed to fetch bag types");
      }
    };

    if (companyId) {
      fetchBagTypes();
    }
  }, [companyId, refreshTrigger, showError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const companyRef = doc(db, "companies", companyId);
      const bagTypesCollectionRef = collection(companyRef, "bagTypes");

      await addDoc(bagTypesCollectionRef, {
        name,
        capacity,
        createdAt: new Date(),
      });

      console.log("Bag Type added:", { name, capacity });
      setName("");
      setCapacity("");
      showSuccess("Bag Type added successfully!");
      setRefreshTrigger((prev) => prev + 1); // Trigger a refresh of the bag types list
    } catch (err) {
      console.error("Error adding bag type:", err);
      showError("Failed to add bag type. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (bagTypeId) => {
    if (!window.confirm("Are you sure you want to delete this bag type?")) {
      return;
    }

    setDeleteLoading(bagTypeId);
    try {
      const companyRef = doc(db, "companies", companyId);
      const bagTypeDocRef = doc(companyRef, "bagTypes", bagTypeId);
      await deleteDoc(bagTypeDocRef);

      showSuccess("Bag Type deleted successfully!");
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("Error deleting bag type:", err);
      showError("Failed to delete bag type. Please try again.");
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <div className={styles["two-column-layout"]}>
      <div className={styles["list-container"]}>
        <div className={styles["list-container-header"]}>
          <div className={styles["list-container-title"]}>
            Bag Types
            <span className={styles["list-count"]}>{bagTypes.length}</span>
          </div>
        </div>

        {bagTypes.length === 0 ? (
          <p className={styles["no-items"]}>No bag types added yet</p>
        ) : (
          <ul className={styles["items-list"]}>
            {bagTypes.map((bagType) => (
              <li key={bagType.id} className={styles["list-item"]}>
                <div className={styles["item-content"]}>
                  <div className={styles["item-name"]}>{bagType.name}</div>
                  <div className={styles["item-details"]}>
                    Capacity: {bagType.capacity}
                  </div>
                </div>
                <button
                  className={styles["delete-button"]}
                  onClick={() => handleDelete(bagType.id)}
                  disabled={deleteLoading === bagType.id}
                  title="Delete bag type"
                >
                  {deleteLoading === bagType.id ? (
                    <div className="loading-spinner-small"></div>
                  ) : (
                    <TrashIcon />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles["form-container"]}>
        <h2>Add New Bag Type</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles["form-group"]}>
            <label htmlFor="bagName">Bag Name:</label>
            <input
              type="text"
              id="bagName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className={styles["form-group"]}>
            <label htmlFor="capacity">Capacity:</label>
            <input
              type="text"
              id="capacity"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            className={styles["submit-button"]}
            disabled={loading}
          >
            {loading ? "Adding..." : "Add Bag Type"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Admin;
