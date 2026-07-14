import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CompareProvider } from "@/components/compare/compare-context";
import { CompareTray } from "@/components/compare/compare-tray";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <CompareProvider>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <CompareTray />
    </CompareProvider>
  );
}
