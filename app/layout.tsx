import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { PwaRegistration } from "@/components/pwa-registration";
import { OfflineIndicator } from "@/components/offline-indicator";
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
  const accountLogoPreloads = [
    "bdo",
    "bpi",
    "gcash",
    "gotyme",
    "maribank",
    "maya",
    "unionbank"
  ];

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var mode=localStorage.getItem("kwarta:color-mode");var isDark=mode==="dark"||(mode==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(isDark){document.documentElement.classList.add("dark");}var valid=["black","green","teal","blue","indigo","purple","rose","amber","pink"];var theme=localStorage.getItem("kwarta:accent-theme");document.documentElement.dataset.accent=valid.indexOf(theme)>-1?theme:"black";}catch(error){}})();'
          }}
        />
        {accountLogoPreloads.map((logo) => (
          <link
            as="image"
            href={`/account-logos/${logo}.svg`}
            key={logo}
            rel="preload"
            type="image/svg+xml"
          />
        ))}
      </head>
      <body className={GeistSans.variable}>
        <PwaRegistration />
        <OfflineIndicator />
        {children}
      </body>
    </html>
  );
}
