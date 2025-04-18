"use client";

import { Geist, Geist_Mono } from "next/font/google";
import { AppContextProvider } from "../context/AppContext";
import { NotificationProvider } from "../context/NotificationContext";
import HelpButton from "../components/HelpButton";
import "./globals.css";
import { useState, useEffect } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function ResponsiveCheck({ children }) {
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const checkDevice = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  if (!isClient) return null; // Avoid hydration mismatch

  if (isMobile) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          textAlign: "center",
          padding: "20px",
        }}
      >
        <h1
          style={{
            fontSize: "32px",
            fontWeight: "700",
            color: "var(--primary)",
            marginBottom: "20px",
          }}
        >
          R.K. Minerals
        </h1>
        <p
          style={{
            fontSize: "16px",
            lineHeight: "1.5",
            maxWidth: "80%",
          }}
        >
          This application does not support mobile screens for accessibility
          reasons. Please access the application on a desktop or laptop
          computer.
        </p>
      </div>
    );
  }

  return children;
}

export default function RootLayout({ children }) {
  const [showHelpButton, setShowHelpButton] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Check if the current path is not the user manual page
    const isNotManualPage = window.location.pathname !== "/user-manual";
    setShowHelpButton(isNotManualPage);

    // Listen for route changes
    const handleRouteChange = () => {
      const isNotManualPage = window.location.pathname !== "/user-manual";
      setShowHelpButton(isNotManualPage);
    };

    window.addEventListener("popstate", handleRouteChange);

    return () => {
      window.removeEventListener("popstate", handleRouteChange);
    };
  }, []);

  return (
    <html lang="en">
      <head>
        <title>RK Minerals</title>
        <meta name="description" content="RK Minerals Tools" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AppContextProvider>
          <NotificationProvider>
            <ResponsiveCheck>
              {children}
              {isClient && showHelpButton && <HelpButton />}
            </ResponsiveCheck>
          </NotificationProvider>
        </AppContextProvider>
      </body>
    </html>
  );
}
