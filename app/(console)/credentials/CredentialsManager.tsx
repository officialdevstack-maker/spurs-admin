"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Eye, EyeOff, Trash2, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { saveCredentialAction, deleteCredentialAction, revealCredentialAction } from "./actions";

interface Cred {
  id: string; appId: string; key: string; scope: string; secret: boolean;
  description: string | null; masked: string; updatedAt: string; updatedBy: string | null;
}

export default function CredentialsManager({
  credentials, apps, canDelete,
}: {
  credentials: Cred[];
  apps: { id: string; name: string }[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function reveal(id: string) {
    if (revealed[id] !== undefined) {
      setRevealed((r) => { const n = { ...r }; delete n[id]; return n; });
      return;
    }
    const v = await revealCredentialAction(id);
    if (v !== null) setRevealed((r) => ({ ...r, [id]: v }));
  }

  async function save(formData: FormData) {
    setSaving(true);
    try {
      await saveCredentialAction(formData);
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="py-0">
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <div className="text-sm font-medium">{credentials.length} credentials</div>
          <div className="text-muted-foreground text-xs">The source of truth every app reads its config from.</div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus /> New credential</Button>
          </DialogTrigger>
          <DialogContent>
            <form action={save}>
              <DialogHeader>
                <DialogTitle>New credential</DialogTitle>
                <DialogDescription>Set a config value for an app or all apps. Stored encrypted.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>App</Label>
                    <Select name="appId" defaultValue="global">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">Global (all apps)</SelectItem>
                        {apps.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Scope</Label>
                    <Select name="scope" defaultValue="all">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="test">Test</SelectItem>
                        <SelectItem value="live">Live</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="key">Key</Label>
                  <Input id="key" name="key" required placeholder="INTERNAL_API_SECRET" className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value">Value</Label>
                  <Input id="value" name="value" required placeholder="secret value" className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input id="description" name="description" placeholder="What this is for" />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="secret" defaultChecked className="size-4" /> Secret (mask in the UI)
                </label>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />} Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>App</TableHead>
            <TableHead>Key</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Scope</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {credentials.map((c) => {
            const shown = revealed[c.id];
            return (
              <TableRow key={c.id}>
                <TableCell><Badge variant={c.appId === "global" ? "default" : "secondary"}>{c.appId}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{c.key}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <code className="max-w-[220px] truncate text-xs">{shown ?? c.masked}</code>
                    {c.secret && (
                      <button onClick={() => reveal(c.id)} className="text-muted-foreground hover:text-foreground" title="Reveal">
                        {shown !== undefined ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                    )}
                    {shown !== undefined && (
                      <button
                        onClick={() => { navigator.clipboard.writeText(shown); setCopiedId(c.id); setTimeout(() => setCopiedId(null), 1200); }}
                        className="text-muted-foreground hover:text-foreground"
                        title="Copy"
                      >
                        {copiedId === c.id ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                      </button>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs capitalize">{c.scope}</TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {new Date(c.updatedAt).toLocaleDateString()}{c.updatedBy ? ` · ${c.updatedBy}` : ""}
                </TableCell>
                <TableCell className="text-right">
                  {canDelete && (
                    <button
                      onClick={async () => { if (confirm(`Delete ${c.appId}:${c.key}?`)) { await deleteCredentialAction(c.id); router.refresh(); } }}
                      className="text-muted-foreground hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {credentials.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-muted-foreground py-8 text-center">No credentials yet.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
