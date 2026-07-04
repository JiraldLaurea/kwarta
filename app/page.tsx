import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "Kwarta — Budget tracking that works offline",
  description:
    "A precise, focused budget tracker for your income, expenses, categories, and limits. Free, works offline, and installs like an app.",
  openGraph: {
    title: "Kwarta — Budget tracking that works offline",
    description:
      "A precise, focused budget tracker for your income, expenses, categories, and limits. Free, works offline, and installs like an app.",
    type: "website"
  }
};

export default function Home() {
  return <LandingPage />;
}
