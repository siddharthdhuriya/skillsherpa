"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { CompareToggle } from "@/components/compare/compare-button";
import { CourseThumbnail } from "@/components/course-thumbnail";
import { PlatformBadge } from "@/components/platform-badge";
import { RatingStars } from "@/components/rating-stars";
import { formatPrice } from "@/lib/format";
import type { PublicCourse } from "@/lib/database.types";
import { Clock, Globe } from "lucide-react";

// The card used on every listing surface. Real 3D tilt driven by pointer
// position (useMotionValue -> useTransform -> rotateX/rotateY), disabled for
// reduced-motion users. Transform/opacity only: no layout-shifting animation.
export function CourseCard({
  course,
  interactive = true,
}: {
  course: PublicCourse;
  interactive?: boolean;
}) {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [6, -6]), { stiffness: 250, damping: 25 });
  const rotateY = useSpring(useTransform(px, [0, 1], [-6, 6]), { stiffness: 250, damping: 25 });

  const tiltEnabled = interactive && !prefersReducedMotion;

  function onPointerMove(e: React.PointerEvent) {
    if (!tiltEnabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  }

  function onPointerLeave() {
    px.set(0.5);
    py.set(0.5);
  }

  const href = `/courses/${course.category.slug}/${course.slug}`;
  const price = formatPrice(course.price_range, course.price_amount, course.currency);

  return (
    <motion.article
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={tiltEnabled ? { rotateX, rotateY, transformPerspective: 900 } : undefined}
      whileHover={tiltEnabled ? { y: -4 } : undefined}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-lg"
    >
      {/* Thumbnail (or branded gradient tile) — fixed aspect, zero CLS */}
      <div className="relative">
        <CourseThumbnail
          title={course.title}
          thumbnailUrl={course.thumbnail_url}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          <Badge variant="secondary" className="bg-background/85 backdrop-blur-sm">
            {course.category.name}
          </Badge>
        </div>
        <div className="absolute right-3 top-3 flex items-center gap-2">
          {course.price_range === "free" && (
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Free</Badge>
          )}
          {interactive && <CompareToggle course={{ slug: course.slug, title: course.title }} />}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <PlatformBadge name={course.platform.name} logoUrl={course.platform.logo_url} />
        <h3 className="font-heading text-base font-semibold leading-snug">
          <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none">
            {course.title}
          </Link>
        </h3>
        <RatingStars rating={course.external_rating} reviewCount={course.review_count} />
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {course.duration && (
              <span className="inline-flex items-center gap-1">
                <Clock aria-hidden="true" className="size-3.5" />
                {course.duration}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Globe aria-hidden="true" className="size-3.5" />
              {course.language}
            </span>
          </div>
          {course.price_range !== "free" && (
            <span className="text-sm font-semibold text-primary">{price}</span>
          )}
        </div>
      </div>
    </motion.article>
  );
}
