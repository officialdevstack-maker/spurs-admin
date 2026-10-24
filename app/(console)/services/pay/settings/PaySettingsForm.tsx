"use client";

import { useState, useTransition } from "react";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PaySettingsCatalog, PaySettingItem, PaySettingValue } from "@/lib/pay-settings";
import { savePaySettingsAction } from "./actions";

// Kept local (pay-settings.ts is server-only; can't import values from a client component).
const PAYMENT_METHOD_OPTIONS = [
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "ussd", label: "USSD" },
  { value: "wallet", label: "Wallet" },
];

export default function PaySettingsForm({ catalog }: { catalog: PaySettingsCatalog }) {
  const initial = flatten(catalog);
  const [values, setValues] = useState<Record<string, PaySettingValue>>(initial);
  const [saved, setSaved] = useState<Record<string, PaySettingValue>>(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = Object.keys(values).filter((k) => values[k] !== saved[k]);
  const set = (k: string, v: PaySettingValue) => { setMsg(null); setValues((p) => ({ ...p, [k]: v })); };

  const save = () =>
    start(async () => {
      const changed = Object.fromEntries(dirty.map((k) => [k, values[k]]));
      const res = await savePaySettingsAction(changed);
      if (res.ok) { setSaved(values); setMsg({ ok: true, text: "Saved — served to Pay from admin config." }); }
      else setMsg({ ok: false, text: res.error });
    });

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Stored in the admin config registry for Pay and served over the config API — they take effect once Pay reads its config from admin.
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

function Field({ item, value, onChange }: { item: PaySettingItem; value: PaySettingValue; onChange: (v: PaySettingValue) => void }) {
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
  if (item.type === "methods") {
    const selected = new Set(String(value).split(",").filter(Boolean));
    const toggle = (m: string, on: boolean) => {
      const next = new Set(selected);
      on ? next.add(m) : next.delete(m);
      onChange(PAYMENT_METHOD_OPTIONS.map((o) => o.value).filter((v) => next.has(v)).join(","));
    };
    return (
      <div className="space-y-1.5">
        <div className="text-sm font-medium">{item.label}</div>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHOD_OPTIONS.map((o) => (
            <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <input type="checkbox" className="accent-primary size-4" checked={selected.has(o.value)} onChange={(e) => toggle(o.value, e.target.checked)} />
              {o.label}
            </label>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">{item.help}</p>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium">{item.label}</div>
      <Input
        type={item.type === "int" ? "number" : "text"}
        value={String(value)}
        onChange={(e) => onChange(item.type === "int" ? Number(e.target.value) : e.target.value)}
      />
      <p className="text-muted-foreground text-xs">{item.help}</p>
    </div>
  );
}

function flatten(catalog: PaySettingsCatalog): Record<string, PaySettingValue> {
  const out: Record<string, PaySettingValue> = {};
  for (const items of Object.values(catalog)) for (const it of items) out[it.key] = it.value;
  return out;
}
