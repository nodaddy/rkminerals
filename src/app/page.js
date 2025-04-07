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
      <header className="header">
        <div className="logo">R.K. Minerals</div>
      </header>

      <main className={styles.main}>
        {loading ? <div className="loading">Loading...</div> : <SignInForm />}
      </main>

      <style jsx>{`
        .header {
          position: absolute;
          top: 0;
          right: 0;
          padding: 20px;
          display: flex;
          justify-content: flex-end;
          width: 100%;
        }

        .logo {
          font-size: 22px;
          font-weight: 700;
          color: var(--primary);
        }

        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 300px;
        }
      `}</style>
    </div>
  );
}
