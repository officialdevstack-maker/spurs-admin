"use client";

import { useState, useTransition } from "react";
import { Loader2, Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SettingsCatalog, SettingItem } from "@/lib/sdk/accounts";
import { saveSettingsAction } from "./actions";

type Val = boolean | number | string;

export default function SettingsForm({ catalog }: { catalog: SettingsCatalog }) {
  const initial = flatten(catalog);
  const [values, setValues] = useState<Record<string, Val>>(initial);
  const [saved, setSaved] = useState<Record<string, Val>>(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirtyKeys = Object.keys(values).filter((k) => values[k] !== saved[k]);
  const set = (k: string, v: Val) => { setMsg(null); setValues((p) => ({ ...p, [k]: v })); };

  const save = () =>
    start(async () => {
      const changed = Object.fromEntries(dirtyKeys.map((k) => [k, values[k]]));
      const res = await saveSettingsAction(changed);
      if (res.ok) { setSaved(values); setMsg({ ok: true, text: "Settings saved — live across the identity platform." }); }
      else setMsg({ ok: false, text: res.error });
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          These control the identity provider directly. A <Zap className="inline size-3" /> <span className="font-medium">live</span> setting takes effect on the next request.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {Object.entries(catalog).map(([group, items]) => (
          <Card key={group}>
            <CardHeader className="pb-3"><CardTitle className="text-base">{group}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => (
                <Field key={item.key} item={item} value={values[item.key]} onChange={(v) => set(item.key, v)} />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sticky save bar */}
      <div className="bg-background/80 sticky bottom-0 flex items-center gap-3 border-t py-3 backdrop-blur">
        <Button onClick={save} disabled={pending || dirtyKeys.length === 0}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Save changes
        </Button>
        {dirtyKeys.length > 0 && <span className="text-muted-foreground text-xs">{dirtyKeys.length} unsaved change{dirtyKeys.length === 1 ? "" : "s"}</span>}
        {msg && <span className={"text-xs " + (msg.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>{msg.text}</span>}
      </div>
    </div>
  );
}

function Field({ item, value, onChange }: { item: SettingItem; value: Val; onChange: (v: Val) => void }) {
  if (item.type === "bool") {
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">{item.label}{item.effect && <LiveTag />}</div>
          <div className="text-muted-foreground text-xs">{item.help}</div>
        </div>
        <Switch checked={!!value} onCheckedChange={(v) => onChange(v)} />
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-sm font-medium">{item.label}{item.effect && <LiveTag />}</div>
      {item.type === "text" ? (
        <Textarea value={String(value)} onChange={(e) => onChange(e.target.value)} rows={3} className="font-mono text-xs" />
      ) : (
        <Input
          type={item.type === "int" ? "number" : "text"}
          value={String(value)}
          onChange={(e) => onChange(item.type === "int" ? Number(e.target.value) : e.target.value)}
        />
      )}
      <p className="text-muted-foreground text-xs">{item.help}</p>
    </div>
  );
}

function LiveTag() {
  return <Badge variant="success" className="gap-1 text-[10px]"><Zap className="size-2.5" /> live</Badge>;
}

function flatten(catalog: SettingsCatalog): Record<string, Val> {
  const out: Record<string, Val> = {};
  for (const items of Object.values(catalog)) for (const it of items) out[it.key] = it.value;
  return out;
}
