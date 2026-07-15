import type { Metadata } from "next";
import { Figtree, Sora, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { GoogleAnalytics } from "@/components/google-analytics";
import { CuelinksScript } from "@/components/cuelinks";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME}: Find and Compare the Best Online Courses`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "SkillSherpa helps you find, compare, and choose the best online courses from trusted partner platforms. Honest summaries, real ratings, side-by-side comparisons.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${figtree.variable} ${sora.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
        <GoogleAnalytics />
        <CuelinksScript />
      </body>
    </html>
  );
}
