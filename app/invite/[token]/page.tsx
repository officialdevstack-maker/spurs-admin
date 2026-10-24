import { ShieldCheck, TriangleAlert } from "lucide-react";
import { findInvite } from "@/lib/teams";
import AcceptForm from "./AcceptForm";

export const dynamic = "force-dynamic";

export default async function AcceptInvite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await findInvite(token);

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-xl font-bold">S</span>
          <span className="font-semibold tracking-tight">Spurs Admin</span>
        </div>

        {!invite ? (
          <div className="rounded-xl border p-6">
            <TriangleAlert className="size-5 text-amber-600" />
            <h1 className="mt-3 text-lg font-semibold tracking-tight">This invitation isn't valid</h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              It may have expired, been used already, or been revoked. Ask whoever invited you to send
              a new one.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border p-6">
            <h1 className="text-lg font-semibold tracking-tight">Set up your account</h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              You've been invited as <strong className="text-foreground">{invite.role}</strong>. Choose a
              password for <strong className="text-foreground">{invite.email}</strong>.
            </p>

            <AcceptForm token={token} defaultName={invite.name ?? ""} />

            <p className="text-muted-foreground mt-4 flex items-start gap-1.5 text-xs">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
              This link works once. After you set a password it stops working.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
