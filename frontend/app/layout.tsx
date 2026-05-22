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
      </head>
      <body>
        <div style={{ position: "relative", zIndex: 1 }}>
          {children}
        </div>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--sur)",
              border: "1px solid var(--bor)",
              color: "var(--tx)",
              fontSize: "13px",
              borderRadius: "var(--r2)",
              boxShadow: "var(--shadow-lg)",
            },
          }}
        />
      </body>
    </html>
  );
}
