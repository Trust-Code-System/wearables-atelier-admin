import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Wearables Atelier — Admin",
    template: "%s · Wearables Atelier Admin",
  },
  description:
    "Wearables Atelier catalog, orders and store settings.",
  robots: { index: false, follow: false },
  icons: { icon: "/brand/wearables-by-ashabi.png", apple: "/brand/wearables-by-ashabi.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <Toaster position="bottom-right" gap={8} />
      </body>
    </html>
  );
}
