"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type SettingValue = boolean | number | string;
type SettingType = "bool" | "int" | "string" | "text" | "methods" | "assets";
interface SettingItem {
  key: string;
  label: string;
  type: SettingType;
  value: SettingValue;
  help: string;
  effect?: boolean;
  rows?: number;
  secret?: boolean;
}
type SettingsCatalog = Record<string, SettingItem[]>;
type SaveResult = { ok: true } | { ok: false; error: string };
type SaveAction = (values: Record<string, SettingValue>) => Promise<SaveResult>;

export default function SettingsForm({
  catalog,
  saveAction,
  description,
  successMessage,
  options = {},
}: {
  catalog: SettingsCatalog;
  saveAction: SaveAction;
  description: string;
  successMessage: string;
  options?: Record<string, { value: string; label: string }[]>;
}) {
  const initial = flatten(catalog);
  const [values, setValues] = useState<Record<string, SettingValue>>(initial);
  const [saved, setSaved] = useState<Record<string, SettingValue>>(initial);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = Object.keys(values).filter((key) => values[key] !== saved[key]);
  const set = (key: string, value: SettingValue) => {
    setMessage(null);
    setValues((current) => ({ ...current, [key]: value }));
  };

  const save = () => start(async () => {
    const changed = Object.fromEntries(dirty.map((key) => [key, values[key]]));
    const result = await saveAction(changed);
    if (result.ok) {
      setSaved(values);
      setMessage({ ok: true, text: successMessage });
    } else {
      setMessage({ ok: false, text: result.error });
    }
  });

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">{description}</p>
      <div className="grid gap-6 lg:grid-cols-2">
        {Object.entries(catalog).map(([group, items]) => (
          <Card key={group}>
            <CardHeader className="pb-3"><CardTitle className="text-base">{group}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => (
                <Field
                  key={item.key}
                  item={item}
                  value={values[item.key]}
                  options={options[item.key]}
                  onChange={(value) => set(item.key, value)}
                />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="bg-background/80 sticky bottom-0 flex flex-wrap items-center gap-3 border-t py-3 backdrop-blur">
        <Button onClick={save} disabled={pending || dirty.length === 0}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Save changes
        </Button>
        {dirty.length > 0 && (
          <span className="text-muted-foreground text-xs">
            {dirty.length} unsaved change{dirty.length === 1 ? "" : "s"}
          </span>
        )}
        {message && (
          <span role={message.ok ? "status" : "alert"} className={message.ok ? "text-xs text-emerald-600 dark:text-emerald-400" : "text-destructive text-xs"}>
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}

function Field({
  item,
  value,
  options,
  onChange,
}: {
  item: SettingItem;
  value: SettingValue;
  options?: { value: string; label: string }[];
  onChange: (value: SettingValue) => void;
}) {
  if (item.type === "bool") {
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            {item.label}{item.effect && <LiveTag />}
          </div>
          <div className="text-muted-foreground text-xs">{item.help}</div>
        </div>
        <Switch checked={Boolean(value)} onCheckedChange={onChange} />
      </div>
    );
  }
  if (item.type === "methods" || item.type === "assets") {
    const selected = new Set(String(value).split(",").filter(Boolean));
    const choices = options ?? [];
    const toggle = (option: string, enabled: boolean) => {
      const next = new Set(selected);
      if (enabled) next.add(option);
      else next.delete(option);
      onChange(choices.map(({ value: choice }) => choice).filter((choice) => next.has(choice)).join(","));
    };
    return (
      <div className="space-y-1.5">
        <div className="text-sm font-medium">{item.label}</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {choices.map((choice) => (
            <label key={choice.value} className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <input
                type="checkbox"
                className="accent-primary size-4"
                checked={selected.has(choice.value)}
                onChange={(event) => toggle(choice.value, event.target.checked)}
              />
              {choice.label}
            </label>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">{item.help}</p>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-sm font-medium">
        {item.label}{item.effect && <LiveTag />}
      </div>
      {item.secret ? (
        <Input type="password" value={String(value)} onChange={(event) => onChange(event.target.value)} autoComplete="new-password" />
      ) : item.type === "text" ? (
        <Textarea rows={item.rows ?? 3} value={String(value)} onChange={(event) => onChange(event.target.value)} className="font-mono text-xs" />
      ) : (
        <Input
          type={item.type === "int" ? "number" : "text"}
          value={String(value)}
          onChange={(event) => onChange(item.type === "int" ? Number(event.target.value) : event.target.value)}
        />
      )}
      <p className="text-muted-foreground text-xs">{item.help}</p>
    </div>
  );
}

function LiveTag() {
  return <Badge variant="success" className="gap-1 text-[10px]"><Zap className="size-2.5" /> live</Badge>;
}

function flatten(catalog: SettingsCatalog): Record<string, SettingValue> {
  const values: Record<string, SettingValue> = {};
  for (const items of Object.values(catalog)) {
    for (const item of items) values[item.key] = item.value;
  }
  return values;
}
