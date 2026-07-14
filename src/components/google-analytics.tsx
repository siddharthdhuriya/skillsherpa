import Script from "next/script";
import { GA_MEASUREMENT_ID } from "@/lib/analytics";

// Loaded once in the root layout. afterInteractive keeps it off the critical
// rendering path (doesn't compete with LCP), while still firing early enough
// to catch the first pageview.
export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
          window.gtag = gtag;
        `}
      </Script>
    </>
  );
}
