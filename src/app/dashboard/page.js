"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "../../context/AppContext";
import styles from "../page.module.css";
import AppIcons from "@/components/AppIcons";

export default function Dashboard() {
  const { isLoggedIn, user, logout, loading } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    // If not logged in and not loading, redirect to home
    if (!isLoggedIn && !loading) {
      router.push("/");
    }
  }, [isLoggedIn, loading, router]);

  const navigateToTool = (toolPath) => {
    router.push(toolPath);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  // Show loading state or redirect if not authenticated
  if (loading || !isLoggedIn) {
    return <div className={styles.main}>Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <main
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          height: "100vh",
          paddingTop: "60px",
          position: "relative",
          zIndex: "1",
        }}
      >
        <div className="tools-container">
          <h2>
            <span
              style={{
                color: "white",
                backgroundColor: "var(--primary)",
                padding: "4px 8px",
                borderRadius: "6px",
              }}
            >
              RK Minerals
            </span>{" "}
            <span style={{ fontWeight: "400" }}>&nbsp;Applications Suite</span>
          </h2>
          <p className="tools-intro">Select an application to get started</p>

          <div className="tools-grid">
            <div
              className="tool-card"
              onClick={() => navigateToTool("/tools/stock-register")}
            >
              <div className="tool-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                  <path d="M12 11h4"></path>
                  <path d="M12 16h4"></path>
                  <path d="M8 11h.01"></path>
                  <path d="M8 16h.01"></path>
                </svg>
              </div>
              <div className="tool-name">Stock Register</div>
              <div className="tool-description">
                Manage your inventory and stock levels
              </div>
            </div>

            <div
              style={{
                border: "0px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                borderRadius: "50%",
                position: "absolute",
                backgroundColor: "white",
                padding: "20px",
                bottom: "40px",
                right: "40px",
              }}
              onClick={() => {
                alert(
                  "Kindly email us your requirements at support@nexonware.com"
                );
              }}
            >
              <AppIcons.Add
                style={{
                  width: "50px",
                  height: "50px",
                  color: "var(--primary)",
                }}
              />
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .dashboard-container {
          position: relative;
          width: 100%;
          min-height: 100vh;
          background: linear-gradient(
            135deg,
            white 50%,
            var(--primary-light, #e6f3ff) 50%
          );
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
        }

        h1 {
          color: var(--primary);
          font-size: 28px;
          margin: 0;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .logout-button {
          background-color: transparent;
          color: var(--primary);
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .logout-button:hover {
          background-color: var(--primary-transparent);
        }

        .tools-container {
          min-width: 100vw;
          padding: 0px 40px;
        }

        h2 {
          color: var(--neutral-900);
          margin-bottom: 8px;
        }

        .tools-intro {
          color: var(--neutral-600);
          margin-bottom: 24px;
        }

        .tools-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
        }

        .tool-card {
          background-color: white;
          border: 1px solid var(--primary);
          border-radius: 12px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
        }

        .tool-card:hover {
          box-shadow: var(--shadow-md);
          border-color: var(--primary-light);
        }

        .tool-card.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .tool-card.disabled:hover {
          transform: none;
          box-shadow: none;
          border-color: var(--neutral-200);
        }

        .tool-icon {
          width: 56px;
          height: 56px;
          color: var(--primary);
          margin-bottom: 16px;
        }

        .tool-name {
          font-weight: 600;
          font-size: 18px;
          text-align: center;
          margin-bottom: 10px;
        }

        .tool-description {
          font-size: 14px;
          color: var(--neutral-500);
          text-align: center;
        }
      `}</style>
    </div>
  );
}
