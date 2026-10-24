"use client";

import { useState, useTransition } from "react";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SuiteSettingsCatalog } from "@/lib/suite-settings";
import type { WalletSettingItem, WalletSettingValue } from "@/lib/wallet-settings";
import { saveSuiteSettingsAction } from "./actions";

export default function SuiteSettingsForm({ catalog }: { catalog: SuiteSettingsCatalog }) {
  const initial = flatten(catalog);
  const [values, setValues] = useState<Record<string, WalletSettingValue>>(initial);
  const [saved, setSaved] = useState<Record<string, WalletSettingValue>>(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = Object.keys(values).filter((k) => values[k] !== saved[k]);
  const set = (k: string, v: WalletSettingValue) => { setMsg(null); setValues((p) => ({ ...p, [k]: v })); };

  const save = () =>
    start(async () => {
      const changed = Object.fromEntries(dirty.map((k) => [k, values[k]]));
      const res = await saveSuiteSettingsAction(changed);
      if (res.ok) { setSaved(values); setMsg({ ok: true, text: "Saved — served to Suite from admin config." }); }
      else setMsg({ ok: false, text: res.error });
    });

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Stored in the admin config registry for Suite and served over the config API — they take effect once Suite reads its config from admin. Secret fields are blank; leave blank to keep the current value.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        {Object.entries(catalog).map(([group, items]) => (
          <Card key={group}>
            <CardHeader className="pb-3"><CardTitle className="text-base">{group}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => <Field key={item.key} item={item} value={values[item.key]} onChange={(v) => set(item.key, v)} />)}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-background/80 sticky bottom-0 flex items-center gap-3 border-t py-3 backdrop-blur">
        <Button onClick={save} disabled={pending || dirty.length === 0}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Save changes
        </Button>
        {dirty.length > 0 && <span className="text-muted-foreground text-xs">{dirty.length} unsaved change{dirty.length === 1 ? "" : "s"}</span>}
        {msg && <span className={"text-xs " + (msg.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>{msg.text}</span>}
      </div>
    </div>
  );
}

function Field({ item, value, onChange }: { item: WalletSettingItem; value: WalletSettingValue; onChange: (v: WalletSettingValue) => void }) {
  if (item.type === "bool") {
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-medium">{item.label}</div>
          <div className="text-muted-foreground text-xs">{item.help}</div>
        </div>
        <Switch checked={!!value} onCheckedChange={(v) => onChange(v)} />
      </div>
    );
  }
  if (item.type === "text") {
    return (
      <div className="space-y-1.5">
        <div className="text-sm font-medium">{item.label}</div>
        <Textarea rows={8} value={String(value)} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" />
        <p className="text-muted-foreground text-xs">{item.help}</p>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium">{item.label}</div>
      <Input type={item.type === "int" ? "number" : "text"} value={String(value)}
        onChange={(e) => onChange(item.type === "int" ? Number(e.target.value) : e.target.value)} />
      <p className="text-muted-foreground text-xs">{item.help}</p>
    </div>
  );
}

function flatten(catalog: SuiteSettingsCatalog): Record<string, WalletSettingValue> {
  const out: Record<string, WalletSettingValue> = {};
  for (const items of Object.values(catalog)) for (const it of items) out[it.key] = it.value;
  return out;
}
