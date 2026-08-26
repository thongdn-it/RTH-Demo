import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

import "./globals.css";

const sans = Be_Vietnam_Pro({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "RTH Lớp học",
    template: "%s · RTH Lớp học",
  },
  description:
    "Quản lý lớp học, bài tập và điểm số cho học sinh, giáo viên và phụ huynh.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={cn("font-sans antialiased", sans.variable)}>
      <body className="min-h-dvh bg-background text-foreground">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
