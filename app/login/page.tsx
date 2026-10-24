"use client";

import { useActionState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, {});

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Spurs Admin</h1>
            <p className="text-muted-foreground text-sm">The Spurs Cloud control plane</p>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoFocus placeholder="admin@spurs.com.ng" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required placeholder="••••••••" />
            </div>
            {state?.error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Sign in
            </Button>
          </form>
        </div>

        <p className="text-muted-foreground mt-6 text-center text-xs">
          Restricted. Admin access is separate from your Spurs account.
        </p>
      </div>
    </div>
  );
}
