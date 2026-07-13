import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "헤어업 Hair Up",
  description:
    "헤어 디자이너와 샵을 위한 카톡·n8n 상담 예약 자동화와 랜딩페이지 마케팅 솔루션"
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
