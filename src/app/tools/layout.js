"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "../../context/AppContext";

export default function ToolsLayout({ children }) {
  const { isLoggedIn, loading } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoggedIn && !loading) {
      router.push("/");
    }
  }, [isLoggedIn, loading, router]);

  // Don't render anything until authentication check is complete
  if (loading) {
    return <div>Loading...</div>;
  }

  // Render children only if logged in
  return isLoggedIn ? children : null;
}
