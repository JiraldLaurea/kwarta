import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { PwaRegistration } from "@/components/pwa-registration";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kwarta",
  description: "Personal budget tracking dashboard",
  applicationName: "Kwarta",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kwarta"
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }]
  }
};

export const viewport: Viewport = {
  themeColor: "#FAFAFA",
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={GeistSans.variable}>
        <PwaRegistration />
        {children}
      </body>
    </html>
  );
}
