import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SITE_NAME } from "@/lib/site";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await isAdminAuthenticated()) redirect("/admin");
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="font-heading text-2xl font-bold">{SITE_NAME}</p>
          <p className="text-sm text-muted-foreground">Admin panel</p>
        </div>
        <LoginForm supabaseConfigured={isSupabaseConfigured()} />
      </div>
    </main>
  );
}
