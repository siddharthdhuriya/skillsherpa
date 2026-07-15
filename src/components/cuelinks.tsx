import Script from "next/script";

// Cuelinks site-verification/tracking snippet, provided after affiliate
// account approval. This does NOT auto-generate affiliate revenue on its
// own; SkillSherpa deliberately cloaks all outbound links through /go/[slug]
// (server-side redirect, never a raw <a href> to the merchant), so Cuelinks'
// own DOM-scanning auto-link conversion has nothing to convert here. Real
// commission still requires pasting each course's Cuelinks-generated deep
// link into enrollment_link via the admin panel.
const CUELINKS_ID = process.env.NEXT_PUBLIC_CUELINKS_ID;

export function CuelinksScript() {
  if (!CUELINKS_ID) return null;
  return (
    <Script id="cuelinks-init" strategy="afterInteractive">
      {`
        var cId = '${CUELINKS_ID}';
        (function(d, t) {
          var s = document.createElement('script');
          s.type = 'text/javascript';
          s.async = true;
          s.src = (document.location.protocol == 'https:' ? 'https://cdn0.cuelinks.com/js/' : 'http://cdn0.cuelinks.com/js/') + 'cuelinksv2.js';
          document.getElementsByTagName('body')[0].appendChild(s);
        }());
      `}
    </Script>
  );
}
