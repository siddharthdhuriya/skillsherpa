// Google Analytics 4 (gtag.js). Loaded sitewide with next/script; GA's own
// cookies/consent posture is unchanged from default (no consent gate, per
// product decision — India-primary audience, no GDPR/CCPA exposure).
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Fires a GA4 event client-side. Used alongside (not instead of) the
 * server-side click_events insert in /go/[slug] — GA answers "what did
 * visitors do on the site", click_events answers "which course/platform
 * actually got the click", and the two must stay independent: GA can be
 * blocked by an ad blocker or consent choice without losing the affiliate
 * record of truth.
 */
export function trackEnrollClick(params: {
  courseSlug: string;
  courseTitle: string;
  platformName: string;
}) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", "enroll_click", {
    course_slug: params.courseSlug,
    course_title: params.courseTitle,
    platform_name: params.platformName,
  });
}
