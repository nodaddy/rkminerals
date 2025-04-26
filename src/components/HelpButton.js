import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaQuestion } from "react-icons/fa";

const HelpButton = () => {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    router.push("/user-manual");
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: "fixed",
        bottom: "30px",
        left: "30px",
        width: "50px",
        height: "50px",
        borderRadius: "50%",
        backgroundColor: "var(--primary)",
        color: "white",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        border: "none",
        boxShadow: isHovered
          ? "0 8px 16px rgba(0, 0, 0, 0.2)"
          : "0 4px 8px rgba(0, 0, 0, 0.1)",
        cursor: "pointer",
        transition: "all 0.3s ease",
        zIndex: 1000,
        transform: isHovered ? "scale(1.1)" : "scale(1)",
      }}
    >
      <FaQuestion size={20} />
      {isHovered && (
        <span
          style={{
            position: "absolute",
            left: "60px",
            backgroundColor: "white",
            color: "var(--neutral-800)",
            padding: "8px 12px",
            borderRadius: "4px",
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
            whiteSpace: "nowrap",
            fontSize: "14px",
          }}
        >
          Help & User Manual
        </span>
      )}
    </button>
  );
};

export default HelpButton;
