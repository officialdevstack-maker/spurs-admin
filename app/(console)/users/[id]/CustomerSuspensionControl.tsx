"use client";

import { useState, useTransition } from "react";
import { Ban, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { setCustomerSuspensionAction } from "./actions";

export default function CustomerSuspensionControl({
  userId,
  suspendedAt,
  canSuspend,
}: { userId: number; suspendedAt: string | null; canSuspend: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (!canSuspend) return null;

  const suspended = Boolean(suspendedAt);
  const save = () => startTransition(async () => {
    setError(null);
    const result = await setCustomerSuspensionAction(userId, !suspended, reason);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setReason("");
  });

  return (
    <>
      <Button
        size="sm"
        variant={suspended ? "outline" : "destructive"}
        onClick={() => { setReason(""); setError(null); setOpen(true); }}
      >
        {suspended ? <CheckCircle2 className="size-4" /> : <Ban className="size-4" />}
        {suspended ? "Reinstate account" : "Suspend account"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{suspended ? "Reinstate this account?" : "Suspend this account?"}</DialogTitle>
            <DialogDescription>
              {suspended
                ? "The customer will be able to sign in to Accounts again. Other app sessions may remain active until they expire."
                : "This blocks future Accounts sign-ins and revokes Accounts API tokens. Existing sessions in other apps may persist until they expire."}
            </DialogDescription>
          </DialogHeader>
          {!suspended && (
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              placeholder="Reason for suspension"
              aria-label="Reason for suspension"
            />
          )}
          {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button variant={suspended ? "default" : "destructive"} onClick={save} disabled={pending || (!suspended && !reason.trim())}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {suspended ? "Reinstate" : "Suspend account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
