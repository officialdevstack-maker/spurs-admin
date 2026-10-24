"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { testAiAction } from "./actions";

/** Sends one real prompt. A saved form proves nothing until a model answers. */
export default function AiPanel({ canManage }: { canManage: boolean }) {
  const [pending, start] = useTransition();
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string; meta?: string } | null>(null);

  const test = () =>
    start(async () => {
      setResult(null);
      const res = await testAiAction(prompt);
      setResult(
        res.ok
          ? { ok: true, text: res.text, meta: `${res.model} · ${res.tokens} tokens` }
          : { ok: false, text: res.error },
      );
    });

  if (!canManage) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4" /> Send a test prompt
        </CardTitle>
        <p className="text-muted-foreground mt-1 text-sm">
          The only honest check that the provider, key and model all work.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Say hello and name the model you are."
            className="max-w-xl"
          />
          <Button onClick={test} disabled={pending}>
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Send
          </Button>
        </div>

        {result && (
          <div className={`rounded-lg border p-3 text-sm ${
            result.ok ? "" : "border-red-500/40 bg-red-500/10"
          }`}>
            <p className={result.ok ? "" : "text-red-600"}>{result.text}</p>
            {result.meta && (
              <Badge variant="outline" className="mt-2">{result.meta}</Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
