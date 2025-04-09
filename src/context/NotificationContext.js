"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Notification } from "../components/Notification";

// Create notification context
const NotificationContext = createContext();

// Hook to use notification context
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};

// Notification provider component
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  // Add a notification
  const showNotification = useCallback((message, type = "success") => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);

    // Auto-remove notification after 3 seconds
    setTimeout(() => {
      closeNotification(id);
    }, 3000);

    return id;
  }, []);

  // Remove a notification by id
  const closeNotification = useCallback((id) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  }, []);

  // Helper functions for different notification types
  const showSuccess = useCallback(
    (message) => showNotification(message, "success"),
    [showNotification]
  );
  const showError = useCallback(
    (message) => showNotification(message, "error"),
    [showNotification]
  );
  const showInfo = useCallback(
    (message) => showNotification(message, "info"),
    [showNotification]
  );
  const showWarning = useCallback(
    (message) => showNotification(message, "warning"),
    [showNotification]
  );

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        closeNotification,
        showSuccess,
        showError,
        showInfo,
        showWarning,
      }}
    >
      {children}

      {/* Render notifications */}
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          visible={true}
          onClose={() => closeNotification(notification.id)}
        />
      ))}
    </NotificationContext.Provider>
  );
};
