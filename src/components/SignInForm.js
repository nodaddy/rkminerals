"use client";

import { useState } from "react";
import { useAppContext } from "../context/AppContext";
import Button from "./Button";

const SignInForm = () => {
  const { login, authError, setAuthError, loading } = useAppContext();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError("Please enter both email and password");
      return;
    }

    await login(email, password);
  };

  return (
    <div className="sign-in-form">
      <div className="form-header">
        <h2>Welcome</h2>
        <p>Sign in to continue</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <div className="input-container">
            <svg
              className="input-icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6z" />
              <path d="M2 6l10 7 10-7" />
            </svg>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <div className="label-forgot-wrapper">
            <label htmlFor="password">Password</label>
          </div>
          <div className="input-container">
            <svg
              className="input-icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        {authError && <div className="error-message">{authError}</div>}

        <Button type="submit" disabled={loading} className="sign-in-button">
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      <style jsx>{`
        .sign-in-form {
          max-width: 420px;
          width: 100%;
          background-color: white;
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
          padding: 40px;
          position: relative;
          z-index: 1;
        }

        .form-header {
          margin-bottom: 32px;
          text-align: center;
        }

        h2 {
          margin-bottom: 8px;
          color: var(--neutral-900);
          font-size: 24px;
          font-weight: 700;
        }

        p {
          color: var(--neutral-600);
          font-size: 15px;
        }

        .form-group {
          margin-bottom: 24px;
        }

        .label-forgot-wrapper {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: var(--neutral-700);
          font-size: 14px;
        }

        .input-container {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 18px;
          height: 18px;
          color: var(--neutral-500);
        }

        input {
          width: 100%;
          padding: 12px 16px 12px 40px;
          border: 1px solid var(--neutral-300);
          border-radius: 6px;
          font-size: 15px;
          transition: all 0.2s ease;
          background-color: white;
        }

        input:focus {
          border-color: var(--primary);
          outline: none;
          box-shadow: 0 0 0 3px var(--primary-transparent);
        }

        input::placeholder {
          color: var(--neutral-400);
        }

        .error-message {
          color: var(--primary);
          margin-bottom: 20px;
          font-size: 14px;
          background-color: rgba(255, 64, 64, 0.1);
          padding: 10px 14px;
          border-radius: 6px;
          border-left: 3px solid var(--primary);
        }

        .sign-in-button {
          width: 100%;
          margin-top: 8px;
          padding: 12px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 6px;
        }

        @media (max-width: 768px) {
          .sign-in-form {
            padding: 30px 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default SignInForm;
