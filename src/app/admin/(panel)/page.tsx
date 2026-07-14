import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getClickStats, getCourses, getPlatforms } from "@/lib/data";
import { ClicksChart } from "@/components/admin/clicks-chart";
import { formatCount } from "@/lib/format";

export default async function AdminDashboard() {
  const [courses, platforms, stats] = await Promise.all([
    getCourses({ includeInactive: true }),
    getPlatforms(),
    getClickStats(),
  ]);

  const active = courses.filter((c) => c.is_active).length;
  const byPlatform = platforms
    .map((p) => ({
      name: p.name,
      count: courses.filter((c) => c.platform_id === p.id).length,
    }))
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count);
  const maxByPlatform = Math.max(1, ...byPlatform.map((p) => p.count));

  const tiles = [
    { label: "Total courses", value: String(courses.length), hint: `${active} active` },
    { label: "Partner platforms", value: String(platforms.filter((p) => p.has_affiliate_program).length), hint: "with affiliate program" },
    { label: "Clicks, last 7 days", value: formatCount(stats.last7Days), hint: `${formatCount(stats.total)} all time` },
    { label: "Clicks, last 30 days", value: formatCount(stats.last30Days), hint: "via /go redirects" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardHeader className="pb-2">
              <CardDescription>{t.label}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{t.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{t.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Affiliate clicks, last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <ClicksChart data={stats.byDay} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Courses by platform</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {byPlatform.map((p) => (
              <div key={p.name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="tabular-nums text-muted-foreground">{p.count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted" aria-hidden="true">
                  <div
                    className="h-2 rounded-full bg-[var(--chart-1)]"
                    style={{ width: `${(p.count / maxByPlatform) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top clicked courses</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.topCourses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No clicks recorded yet. Clicks are logged when visitors use an Enroll Now link.
            </p>
          ) : (
            <ol className="space-y-2">
              {stats.topCourses.map(({ course, clicks }) => (
                <li key={course.id} className="flex items-center justify-between gap-4 text-sm">
                  <Link
                    href={`/admin/courses/${course.id}/edit`}
                    className="truncate font-medium hover:underline"
                  >
                    {course.title}
                  </Link>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {clicks} {clicks === 1 ? "click" : "clicks"}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
