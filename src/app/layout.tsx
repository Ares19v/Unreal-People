import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Unreal People",
  description: "AI Entity Interfaces",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
