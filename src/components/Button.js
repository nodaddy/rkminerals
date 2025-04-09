"use client";

import React from "react";

const Button = ({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  type = "button",
  className = "",
  ...props
}) => {
  const baseStyles = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "6px",
    padding: "10px 16px",
    fontWeight: "600",
    transition: "all 0.2s ease",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
    border: "none",
    fontSize: "15px",
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "outline":
        return {
          backgroundColor: "transparent",
          color: "var(--primary)",
          border: "1px solid var(--primary)",
          boxShadow: "none",
        };
      case "secondary":
        return {
          background: "linear-gradient(135deg, var(--accent-1), #2a95ec)",
          color: "white",
          boxShadow: "0 4px 12px rgba(64, 168, 255, 0.2)",
        };
      case "text":
        return {
          backgroundColor: "transparent",
          color: "var(--primary)",
          padding: "4px 8px",
          boxShadow: "none",
        };
      default:
        return {
          background:
            "linear-gradient(135deg, var(--primary), var(--primary-dark))",
          color: "white",
          boxShadow: "0 4px 12px rgba(255, 64, 64, 0.2)",
        };
    }
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`button ${className}`}
      style={{ ...baseStyles, ...getVariantStyles() }}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
