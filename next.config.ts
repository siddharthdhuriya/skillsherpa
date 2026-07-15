import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

// CSP is intentionally permissive on script-src/style-src ('unsafe-inline')
// because the GA4/Cuelinks init snippets and Tailwind both rely on inline
// script/style. Everything else is locked to the specific third parties this
// app actually talks to (Supabase Storage, GA4, Cuelinks) — no wildcard
// hosts, except *.cuelinks.com: their tracking script calls undocumented
// subdomains internally (redirect/conversion beacons) that aren't fixed in
// their public docs, so a scoped wildcard on that one domain is the
// pragmatic tradeoff rather than breaking their tracking silently.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://cdn0.cuelinks.com",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: https://www.googletagmanager.com https://www.google-analytics.com https://*.cuelinks.com${supabaseHostname ? ` https://${supabaseHostname}` : ""}`,
  `connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://*.cuelinks.com${supabaseHostname ? ` https://${supabaseHostname} wss://${supabaseHostname}` : ""}`,
  "font-src 'self' data:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Course thumbnails and platform logos uploaded to Supabase Storage.
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          { key: "Content-Security-Policy", value: CSP },
        ],
      },
    ];
  },
};

export default nextConfig;
