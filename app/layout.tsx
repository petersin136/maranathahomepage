import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./pretendard-variable.css";

const bodoni = localFont({
  src: "./fonts/bodoni-moda-latin.woff2",
  weight: "400 700",
  style: "normal",
  variable: "--font-bodoni",
  display: "swap"
});

const montserrat = localFont({
  src: "./fonts/montserrat-latin.woff2",
  weight: "300 600",
  style: "normal",
  variable: "--font-montserrat",
  display: "swap"
});

export const metadata: Metadata = {
  title: "HAIR UP",
  description: "Discover your new favorite salon."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${bodoni.variable} ${montserrat.variable}`}>
      <body>{children}</body>
    </html>
  );
}
