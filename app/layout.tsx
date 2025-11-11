import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Website Template",
  description: "Reusable Next.js website template with Tailwind and Supabase setup."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="bg-white text-neutral-900 antialiased transition-colors duration-200 dark:bg-neutral-950 dark:text-neutral-100">
        {children}
      </body>
    </html>
  );
}
