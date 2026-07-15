import type { Metadata } from "next";
import { Bodoni_Moda, Montserrat } from "next/font/google";
import "./globals.css";

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bodoni",
  display: "swap"
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
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
