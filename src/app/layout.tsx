import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Noto_Sans_Devanagari, Outfit, Plus_Jakarta_Sans } from "next/font/google";
import {
  ClinicProvider,
  ClinicProviderFallback,
} from "@/features/clinic/state/clinic-provider";
import { LangProvider } from "@/i18n/lang-provider";
import { Navbar } from "@/components/navbar";
import { PwaShell } from "@/components/pwa-shell";
import { ErrorBoundary } from "@/components/error-boundary";
import { ToastProvider } from "@/components/toast";
import { StaffBottomNav } from "@/components/staff-bottom-nav";
import { PatientBottomNav } from "@/components/patient-bottom-nav";
import "./globals.css";

const bodyFont = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const displayFont = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const hindiFont = Noto_Sans_Devanagari({
  variable: "--font-hindi",
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Dr SR Panwar Clinic | Smart Appointment & Queue PWA",
  description:
    "Hindi-first multi-clinic PWA with appointment booking, QR walk-in token, staff dashboard aur live queue status.",
  applicationName: "Dr SR Panwar",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Dr SR Panwar",
    startupImage: "/logo.png",
  },
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
    ],
    apple: [
      { url: "/logo.png", sizes: "512x512", type: "image/png" },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "google-site-verification": "I8WRhWkAShFVWjZHnTPc15AxpBkTijOFynaSoa0XDak",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f6b63",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="hi"
      className={`${bodyFont.variable} ${displayFont.variable} ${hindiFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LangProvider>
          <ToastProvider>
            <ErrorBoundary>
              <Suspense
                fallback={
                  <ClinicProviderFallback>
                    <Navbar />
                    <PwaShell />
                    <main className="flex-1 pb-24">{children}</main>
                  </ClinicProviderFallback>
                }
              >
                <ClinicProvider>
                  <Navbar />
                  <PwaShell />
                  <main className="flex-1 pb-24">{children}</main>
                  <StaffBottomNav />
                  <PatientBottomNav />
                </ClinicProvider>
              </Suspense>
            </ErrorBoundary>
          </ToastProvider>
        </LangProvider>
      </body>
    </html>
  );
}
