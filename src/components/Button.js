"use client";

const Button = ({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  type = "button",
  className = "",
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "outline":
        return {
          backgroundColor: "transparent",
          color: "var(--primary)",
          border: "1px solid var(--primary)",
        };
      case "secondary":
        return {
          backgroundColor: "var(--accent-1)",
          color: "white",
        };
      case "text":
        return {
          backgroundColor: "transparent",
          color: "var(--primary)",
          padding: "4px 8px",
        };
      default:
        return {};
    }
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`button ${className}`}
      style={getVariantStyles()}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
