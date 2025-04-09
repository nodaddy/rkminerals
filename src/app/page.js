"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "../context/AppContext";
import SignInForm from "../components/SignInForm";
import styles from "./page.module.css";

export default function Home() {
  const { isLoggedIn, loading } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    // If user is logged in and not in loading state, redirect to dashboard
    if (isLoggedIn && !loading) {
      router.push("/dashboard");
    }
  }, [isLoggedIn, loading, router]);

  return (
    <div className={styles.page}>
      <div className="diagonal-background"></div>

      <main className={styles.main}>
        <div className="authentication-container">
          {loading ? null : <SignInForm />}
          <div className="corporate-background">
            <div className="company-branding">
              <h1 className="company-title">R.K. Minerals</h1>
              <p className="company-tagline">
                {/* Industry Leaders in Mining Operations */}
              </p>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .diagonal-background {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            135deg,
            var(--primary-transparent) 0%,
            rgba(255, 255, 255, 0) 50%
          );
          z-index: 0;
          pointer-events: none;
        }

        .header {
          position: absolute;
          top: 0;
          left: 0;
          padding: 24px 40px;
          display: flex;
          justify-content: flex-start;
          width: 100%;
          z-index: 10;
        }

        .logo {
          font-size: 24px;
          font-weight: 700;
          color: var(--primary);
        }

        .authentication-container {
          display: flex;
          width: 100%;
          max-width: 1000px;
          height: 580px;
          box-shadow: 0 15px 50px rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          overflow: hidden;
          background-color: white;
          position: relative;
        }

        .corporate-background {
          flex: 1;
          background: linear-gradient(
            135deg,
            var(--primary-dark),
            var(--primary)
          );
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          position: relative;
          overflow: hidden;
        }

        .corporate-background::before {
          content: "";
          position: absolute;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.1) 0%,
            rgba(255, 255, 255, 0) 50%
          );
          transform: rotate(-45deg);
        }

        .company-branding {
          text-align: center;
          padding: 0 20px;
          position: relative;
          z-index: 1;
        }

        .company-title {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 16px;
        }

        .company-tagline {
          font-size: 18px;
          opacity: 0.9;
        }

        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 300px;
        }

        @media (max-width: 992px) {
          .authentication-container {
            flex-direction: column-reverse;
            height: auto;
            max-width: 500px;
          }

          .corporate-background {
            padding: 60px 20px;
          }
        }

        @media (max-width: 576px) {
          .header {
            padding: 16px 20px;
          }

          .logo {
            font-size: 20px;
          }

          .corporate-background {
            padding: 40px 20px;
          }

          .company-title {
            font-size: 28px;
          }

          .company-tagline {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}
