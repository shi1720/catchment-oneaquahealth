import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Catchment — Make the next sample count",
  description: "Citizen evidence to transparent sampling decisions. A One Health field operations prototype by Shivam Gupta.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
