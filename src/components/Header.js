"use client";

import { useRouter } from "next/navigation";
import { useAppContext } from "../context/AppContext";
import Button from "./Button";

const Header = ({ showBackButton = false, title }) => {
  const { logout } = useAppContext();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const navigateBack = () => {
    router.push("/dashboard");
  };

  return (
    <header className="header">
      <div className="header-left">
        {showBackButton && (
          <Button variant="text" onClick={navigateBack}>
            <span className="back-arrow">←</span> Back to Dashboard
          </Button>
        )}
        {title && <h1>{title}</h1>}
      </div>
      <div className="header-right">
        <div className="logo">R.K. Minerals</div>
        <Button variant="outline" onClick={handleLogout}>
          Logout
        </Button>
      </div>

      <style jsx>{`
        .header {
          display: flex;
          width: 100%;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--neutral-200);
        }

        .header-left {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .logo {
          font-weight: 700;
          font-size: 18px;
          color: var(--primary);
        }

        h1 {
          color: var(--primary);
          font-size: 24px;
          margin: 0;
        }

        .back-arrow {
          margin-right: 5px;
        }
      `}</style>
    </header>
  );
};

export default Header;
