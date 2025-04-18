"use client";

import { useState } from "react";
import Link from "next/link";
import { FaArrowLeft, FaSearch } from "react-icons/fa";
import styles from "./page.module.css";

export default function UserManual() {
  const [activeSection, setActiveSection] = useState("introduction");
  const [searchQuery, setSearchQuery] = useState("");

  const sections = [
    { id: "introduction", title: "Introduction" },
    { id: "navigation", title: "Navigation" },
    { id: "summary", title: "Summary Dashboard" },
    { id: "incoming", title: "Incoming Entries" },
    { id: "production", title: "Production Entries" },
    { id: "dispatch", title: "Dispatch Entries" },
    { id: "bags", title: "Bags Management" },
    { id: "audit", title: "Audit Log" },
    { id: "admin", title: "Admin Panel" },
  ];

  const filteredSections = sections.filter((section) =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.backButton}>
          <FaArrowLeft /> Back to Dashboard
        </Link>
        <h1 className={styles.title}>Stock Register User Manual</h1>
        <div className={styles.searchContainer}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </header>

      <div className={styles.content}>
        <nav className={styles.sidebar}>
          <ul className={styles.sectionList}>
            {filteredSections.map((section) => (
              <li
                key={section.id}
                className={`${styles.sectionItem} ${
                  activeSection === section.id ? styles.active : ""
                }`}
                onClick={() => setActiveSection(section.id)}
              >
                {section.title}
              </li>
            ))}
          </ul>
        </nav>

        <main className={styles.mainContent}>
          {activeSection === "introduction" && (
            <section>
              <h2>Introduction to Stock Register</h2>
              <p>
                The Stock Register application is designed to help R.K. Minerals
                manage inventory, track production, and monitor stock movements
                efficiently. This comprehensive tool provides real-time insights
                into your inventory status and history.
              </p>
              <p>
                This user manual will guide you through all features and
                functionalities of the Stock Register application to help you
                maximize its potential.
              </p>
              <h3>Key Features</h3>
              <ul>
                <li>Real-time summary dashboard of inventory status</li>
                <li>Incoming material entry management</li>
                <li>Production tracking system</li>
                <li>Dispatch management and reporting</li>
                <li>Bags inventory management</li>
                <li>Comprehensive audit logs</li>
                <li>Administrative tools for system management</li>
              </ul>
            </section>
          )}

          {activeSection === "navigation" && (
            <section>
              <h2>Navigating the Application</h2>
              <p>
                The Stock Register application features a sidebar navigation
                system that allows you to easily access different sections.
                Here's how to navigate:
              </p>
              <h3>Sidebar Navigation</h3>
              <ul>
                <li>
                  <strong>Summary</strong> - Overview of current inventory
                  status
                </li>
                <li>
                  <strong>Incoming Entries</strong> - Record and manage incoming
                  materials
                </li>
                <li>
                  <strong>Production Entries</strong> - Track material
                  processing and production
                </li>
                <li>
                  <strong>Dispatch Entries</strong> - Manage product dispatches
                  to customers
                </li>
                <li>
                  <strong>Bags</strong> - Track bags inventory and usage
                </li>
                <li>
                  <strong>Audit</strong> - View system activity logs
                </li>
                <li>
                  <strong>Admin</strong> - Access administrative functions
                  (admin users only)
                </li>
              </ul>
              <p>
                Click on any menu item to navigate to that section. The active
                section will be highlighted in the sidebar.
              </p>
            </section>
          )}

          {activeSection === "summary" && (
            <section>
              <h2>Summary Dashboard</h2>
              <p>
                The Summary Dashboard provides a comprehensive overview of your
                current inventory status, stock levels, and recent activity.
              </p>
              <h3>Features</h3>
              <ul>
                <li>
                  <strong>Stock Overview</strong> - Quick view of total
                  products, in-stock items, low stock, and out-of-stock items
                </li>
                <li>
                  <strong>Product Search</strong> - Search for specific products
                  to check their stock status
                </li>
                <li>
                  <strong>Monthly Insights</strong> - View monthly statistics
                  for incoming materials, production, and dispatches
                </li>
                <li>
                  <strong>Stock Adjustment</strong> - Directly adjust stock
                  quantities when needed
                </li>
              </ul>
              <h3>How to Use</h3>
              <ol>
                <li>Use the search box to find specific products</li>
                <li>Select month and year to view period-specific data</li>
                <li>Click the refresh button to update all data</li>
                <li>
                  To adjust product quantity, click the edit icon next to the
                  quantity, enter the new value, and save
                </li>
              </ol>
            </section>
          )}

          {activeSection === "incoming" && (
            <section>
              <h2>Incoming Entries</h2>
              <p>
                The Incoming Entries section allows you to record all incoming
                materials from suppliers.
              </p>
              <h3>Features</h3>
              <ul>
                <li>
                  <strong>Add New Entry</strong> - Record new incoming shipments
                </li>
                <li>
                  <strong>Entry List</strong> - View all recorded incoming
                  entries
                </li>
                <li>
                  <strong>Search & Filter</strong> - Find specific entries by
                  date, supplier, or material
                </li>
                <li>
                  <strong>Edit Entries</strong> - Modify existing entries when
                  needed
                </li>
              </ul>
              <h3>Adding a New Incoming Entry</h3>
              <ol>
                <li>Click on "Add New Entry"</li>
                <li>Select the supplier from the dropdown</li>
                <li>Choose the product/material being received</li>
                <li>Enter the quantity received</li>
                <li>Add any notes or reference numbers</li>
                <li>Click "Save" to record the entry</li>
              </ol>
              <p>
                All incoming entries automatically update your inventory levels
                in real-time.
              </p>
            </section>
          )}

          {activeSection === "production" && (
            <section>
              <h2>Production Entries</h2>
              <p>
                The Production Entries section helps you track all production
                activities, including materials used and products created.
              </p>
              <h3>Features</h3>
              <ul>
                <li>
                  <strong>Record Production</strong> - Log new production runs
                </li>
                <li>
                  <strong>Material Consumption</strong> - Track raw materials
                  used in production
                </li>
                <li>
                  <strong>Production Output</strong> - Record finished products
                </li>
                <li>
                  <strong>Production History</strong> - View all production
                  activities
                </li>
              </ul>
              <h3>Recording Production</h3>
              <ol>
                <li>Click "Add Production Entry"</li>
                <li>Select the machine used for production</li>
                <li>Choose input materials and their quantities</li>
                <li>Select the output product and quantity produced</li>
                <li>Add date, time, and operator information</li>
                <li>Save the production record</li>
              </ol>
              <p>
                The system automatically adjusts inventory levels based on
                materials consumed and products created.
              </p>
            </section>
          )}

          {activeSection === "dispatch" && (
            <section>
              <h2>Dispatch Entries</h2>
              <p>
                The Dispatch Entries section allows you to track all outgoing
                shipments to customers or other locations.
              </p>
              <h3>Features</h3>
              <ul>
                <li>
                  <strong>Create Dispatch</strong> - Record new outgoing
                  shipments
                </li>
                <li>
                  <strong>Buyer Selection</strong> - Choose from registered
                  buyers
                </li>
                <li>
                  <strong>Product Selection</strong> - Select products being
                  dispatched
                </li>
                <li>
                  <strong>Quantity Management</strong> - Record quantities of
                  dispatched items
                </li>
                <li>
                  <strong>Dispatch History</strong> - View and filter past
                  dispatches
                </li>
              </ul>
              <h3>Creating a Dispatch Entry</h3>
              <ol>
                <li>Click "Add Dispatch Entry"</li>
                <li>Select the buyer/customer</li>
                <li>Choose the products being dispatched</li>
                <li>Enter quantities for each product</li>
                <li>
                  Add invoice numbers, vehicle details, and other information
                </li>
                <li>Save the dispatch record</li>
              </ol>
              <p>
                Inventory levels are automatically adjusted when dispatches are
                recorded.
              </p>
            </section>
          )}

          {activeSection === "bags" && (
            <section>
              <h2>Bags Management</h2>
              <p>
                The Bags Management section helps you track bag inventory,
                consumption, and usage across operations.
              </p>
              <h3>Features</h3>
              <ul>
                <li>
                  <strong>Bag Types</strong> - Manage different types of bags
                  used
                </li>
                <li>
                  <strong>Inventory Tracking</strong> - Monitor bag stock levels
                </li>
                <li>
                  <strong>Usage Records</strong> - Track bag consumption in
                  production
                </li>
                <li>
                  <strong>Bag Receipts</strong> - Record new bag shipments
                  received
                </li>
              </ul>
              <h3>Managing Bag Inventory</h3>
              <ol>
                <li>View current bag inventory levels by type</li>
                <li>Record new bag receipts when inventory is replenished</li>
                <li>Track bag usage in production processes</li>
                <li>
                  Generate reports on bag consumption and inventory status
                </li>
              </ol>
              <p>
                Properly managing bag inventory helps ensure production can
                continue without interruptions.
              </p>
            </section>
          )}

          {activeSection === "audit" && (
            <section>
              <h2>Audit Log</h2>
              <p>
                The Audit section provides a detailed log of all system
                activities for accountability and tracking purposes.
              </p>
              <h3>Features</h3>
              <ul>
                <li>
                  <strong>Activity Tracking</strong> - Record of all actions
                  taken in the system
                </li>
                <li>
                  <strong>User Attribution</strong> - See which user performed
                  each action
                </li>
                <li>
                  <strong>Data Changes</strong> - View before and after values
                  for changes
                </li>
                <li>
                  <strong>Filtering</strong> - Filter logs by date, user, or
                  action type
                </li>
              </ul>
              <h3>Using the Audit Log</h3>
              <ol>
                <li>Access the Audit section from the sidebar</li>
                <li>Use filters to narrow down the displayed entries</li>
                <li>View detailed information about each logged action</li>
                <li>
                  Update audit logs for anytime and the changes would be updated
                  in the summary dashboard
                </li>
              </ol>
              <p>
                The audit log is crucial for maintaining accountability and
                tracking changes throughout the system.
              </p>
            </section>
          )}

          {activeSection === "admin" && (
            <section>
              <h2>Admin Panel</h2>
              <p>
                The Admin Panel provides administrative functions for managing
                the system. This section is only accessible to users with admin
                privileges.
              </p>
              <h3>Features</h3>
              <ul>
                <li>
                  <strong>User Management</strong> - Add, edit, or remove system
                  users
                </li>
                <li>
                  <strong>Product Configuration</strong> - Manage product
                  catalog
                </li>
                <li>
                  <strong>Supplier Management</strong> - Add and edit supplier
                  information
                </li>
                <li>
                  <strong>Buyer Management</strong> - Maintain buyer/customer
                  records
                </li>
                <li>
                  <strong>Machine Configuration</strong> - Set up production
                  machines
                </li>
                <li>
                  <strong>Bag Type Management</strong> - Configure bag types and
                  specifications
                </li>
              </ul>
              <h3>Administrative Tasks</h3>
              <ol>
                <li>Regularly update product information as needed</li>
                <li>Maintain accurate supplier and buyer records</li>
                <li>Manage user access and permissions</li>
              </ol>
              <p>
                Proper administration ensures the system remains accurate and
                effective for all users.
              </p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
