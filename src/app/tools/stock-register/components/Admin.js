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
  const { companyId, products, fetchEntities } = useAppContext();
  const { showSuccess, showError } = useNotification();
  const [technicalName, setTechnicalName] = useState("");
  const [commonName, setCommonName] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);

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
      fetchEntities(); // Refresh entities after adding
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
      fetchEntities(); // Refresh entities after deleting
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
  const { companyId, machines, fetchEntities } = useAppContext();
  const { showSuccess, showError } = useNotification();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);

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
      fetchEntities(); // Refresh entities after adding
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
      fetchEntities(); // Refresh entities after deleting
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
  const { companyId, suppliers, fetchEntities } = useAppContext();
  const { showSuccess, showError } = useNotification();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);

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
      fetchEntities(); // Refresh entities after adding
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
      fetchEntities(); // Refresh entities after deleting
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
  const { companyId, buyers, fetchEntities } = useAppContext();
  const { showSuccess, showError } = useNotification();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);

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
      fetchEntities(); // Refresh entities after adding
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
      fetchEntities(); // Refresh entities after deleting
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
  const { companyId, bagTypes, fetchEntities } = useAppContext();
  const { showSuccess, showError } = useNotification();
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const companyRef = doc(db, "companies", companyId);
      const bagTypesCollectionRef = collection(companyRef, "bagTypes");

      await addDoc(bagTypesCollectionRef, {
        name,
        capacity: parseFloat(capacity),
        createdAt: new Date(),
      });

      console.log("Bag type added:", { name, capacity });
      setName("");
      setCapacity("");
      showSuccess("Bag type added successfully!");
      fetchEntities(); // Refresh entities after adding
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

      showSuccess("Bag type deleted successfully!");
      fetchEntities(); // Refresh entities after deleting
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
            <label htmlFor="bagTypeName">Bag Type Name:</label>
            <input
              type="text"
              id="bagTypeName"
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
              step="0.01"
              min="0"
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
