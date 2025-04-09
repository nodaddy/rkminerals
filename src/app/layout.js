import { Geist, Geist_Mono } from "next/font/google";
import { AppContextProvider } from "../context/AppContext";
import { NotificationProvider } from "../context/NotificationContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "RK Minerals",
  description: "RK Minerals Tools",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AppContextProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </AppContextProvider>
      </body>
    </html>
  );
}
