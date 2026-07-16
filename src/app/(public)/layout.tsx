import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CompareProvider } from "@/components/compare/compare-context";
import { CompareTray } from "@/components/compare/compare-tray";
import { GoogleAnalytics } from "@/components/google-analytics";
import { CuelinksScript } from "@/components/cuelinks";

// GA4 and Cuelinks are scoped to the public site only, not /admin — the
// site owner's own admin usage shouldn't pollute traffic analytics, and
// there's no outbound affiliate link for Cuelinks to track there anyway.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <CompareProvider>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <CompareTray />
      <GoogleAnalytics />
      <CuelinksScript />
    </CompareProvider>
  );
}
