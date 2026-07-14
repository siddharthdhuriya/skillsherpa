import type { Metadata } from "next";

// Everything under /admin is noindex (also disallowed in robots.txt).
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
