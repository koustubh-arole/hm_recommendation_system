import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "H&M Retail AI — Intelligence at Scale",
  description: "Premium AI retail recommendation, segmentation & forecasting platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="amb" aria-hidden="true">
          <div className="amb-blob blob1" />
          <div className="amb-blob blob2" />
          <div className="amb-blob blob3" />
        </div>
        <div className="grid-overlay" aria-hidden="true" />
        <div style={{ position: "relative", zIndex: 1 }}>
          {children}
        </div>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--sur)",
              border: "1px solid var(--bor2)",
              color: "var(--tx)",
              fontSize: "13px",
              borderRadius: "14px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            },
          }}
        />
      </body>
    </html>
  );
}
