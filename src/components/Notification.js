"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./Notification.module.css";

const NotificationContainer = ({ children }) => {
  return createPortal(
    <div className={styles["notification-container"]}>{children}</div>,
    document.body
  );
};

export const Notification = ({
  message,
  type = "success",
  visible = false,
  onClose,
}) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <NotificationContainer>
      <div
        className={`${styles.notification} ${styles[`notification-${type}`]}`}
      >
        <div className={styles.content}>{message}</div>
      </div>
    </NotificationContainer>
  );
};

export const NotificationProvider = ({ children }) => {
  return <>{children}</>;
};
