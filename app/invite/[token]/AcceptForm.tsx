"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInviteAction } from "./actions";

export default function AcceptForm({ token, defaultName }: { token: string; defaultName: string }) {
  const [name, setName] = useState(defaultName);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const tooShort = password.length > 0 && password.length < 10;
  const mismatch = confirm.length > 0 && password !== confirm;

  const submit = () =>
    start(async () => {
      setError(null);
      const res = await acceptInviteAction(token, name, password);
      // On success the action redirects, so anything returned is a failure.
      if (res && !res.ok) setError(res.error);
    });

  return (
    <div className="mt-5 space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="name">Your name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Obi" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)} placeholder="At least 10 characters" />
        {tooShort && <p className="text-xs text-amber-600">Use at least 10 characters.</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        {mismatch && <p className="text-xs text-amber-600">These don't match.</p>}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button className="w-full" onClick={submit}
        disabled={pending || !name || password.length < 10 || password !== confirm}>
        {pending && <Loader2 className="size-3.5 animate-spin" />}
        Create my account
      </Button>
    </div>
  );
}
