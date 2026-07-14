import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  FolderTree,
  GraduationCap,
  LayoutDashboard,
  MonitorPlay,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { logout } from "@/app/admin/actions";
import { SITE_NAME } from "@/lib/site";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/courses", label: "Courses", icon: GraduationCap },
  { href: "/admin/import", label: "Bulk import", icon: Upload },
  { href: "/admin/platforms", label: "Platforms", icon: MonitorPlay },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
];

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  const demoMode = !isSupabaseConfigured();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2 border-b px-4 py-4">
          <BarChart3 aria-hidden="true" className="size-5 text-primary" />
          <span className="font-heading font-bold">{SITE_NAME}</span>
        </div>
        <nav aria-label="Admin navigation" className="flex-1 space-y-1 p-3">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-3">
          <form action={logout}>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {demoMode && (
          <div
            role="status"
            className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs font-medium text-amber-700 dark:text-amber-400"
          >
            Demo mode: Supabase is not connected. Edits work but reset on server restart.
          </div>
        )}
        {/* Mobile nav */}
        <nav
          aria-label="Admin navigation"
          className="flex gap-1 overflow-x-auto border-b p-2 md:hidden"
        >
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent"
            >
              {label}
            </Link>
          ))}
        </nav>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
