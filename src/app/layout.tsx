import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QR Menu — QR Ordering for Restaurants",
  description:
    "QR code menus and ordering for small restaurants and cafés.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
