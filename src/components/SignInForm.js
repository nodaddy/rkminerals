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
      <h2>Sign in to proceed</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>

        {authError && <div className="error-message">{authError}</div>}

        <Button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      <style jsx>{`
        .sign-in-form {
          max-width: 400px;
          width: 100%;
        }

        h2 {
          margin-bottom: 24px;
          text-align: center;
          color: var(--neutral-900);
        }

        .form-group {
          margin-bottom: 16px;
        }

        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
        }

        input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--neutral-300);
          border-radius: 4px;
          font-size: 16px;
          transition: border-color 0.2s;
        }

        input:focus {
          border-color: var(--primary);
          outline: none;
        }

        .error-message {
          color: var(--primary);
          margin-bottom: 16px;
          font-size: 14px;
        }

        button {
          width: 100%;
          margin-top: 8px;
        }
      `}</style>
    </div>
  );
};

export default SignInForm;
