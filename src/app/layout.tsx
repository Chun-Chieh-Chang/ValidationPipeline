import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "射出成型確效管理系統 (Validation Management System)",
  description: "模具變更與確效案件即時追蹤",
  icons: {
    icon: "/icon.svg",
  },
};

import { ThemeProvider } from "@/components/ThemeProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <head>
        <Script 
          src="https://accounts.google.com/gsi/client" 
          strategy="beforeInteractive"
        />
      </head>
      <body className={`${inter.className} bg-background text-foreground no-scrollbar transition-colors duration-300`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
