"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { demoLogin, loginWithPassword } from "@/app/admin/actions";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm({ supabaseConfigured }: { supabaseConfigured: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  function onSubmit(values: LoginValues) {
    setError(null);
    startTransition(async () => {
      const result = await loginWithPassword(values.email, values.password);
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          {supabaseConfigured
            ? "Use your admin email and password."
            : "Supabase is not connected yet, so the panel runs in demo mode."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {supabaseConfigured ? (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        ) : (
          <form action={demoLogin}>
            <Button type="submit" className="w-full">
              Enter demo admin
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Changes made in demo mode live in memory and reset when the server restarts. Add
              real Supabase credentials to .env.local to enable email/password sign-in.
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
