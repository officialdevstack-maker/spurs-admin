"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const inp = "h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:border-primary";

type Props = {
  provider?: string;
  configured?: boolean;   // a token is already stored
  account?: string;
  region?: string;
};

// The paper data-provider card reshapes to the selected provider: MT5 (MetaApi)
// needs a token + account id + region; Binance/Bybit use public data and need
// nothing; "none" disables the feed. Purely presentational — inputs keep their
// names so the same server action reads them.
export function PaperDataProvider({ provider = "binance", configured = false, account = "", region = "new-york" }: Props) {
  const [sel, setSel] = useState(provider === "metaapi" ? "mt5" : provider);
  const isMt5 = sel === "mt5";
  const isCrypto = sel === "binance" || sel === "bybit";
  const isNone = sel === "none";

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Paper market data</CardTitle></CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <p className="text-muted-foreground sm:col-span-2 text-xs">
          Paper mode trades against this provider&apos;s live quotes &amp; candles, so a paper run mirrors going live.
          Pick the provider — the fields below adjust to what it needs.
        </p>

        <Field label="Data provider (paper)">
          <select name="AITRADER_DATA_PROVIDER" value={sel} onChange={(e) => setSel(e.target.value)} className={inp}>
            <option value="mt5">MT5 / MetaApi (multi-asset)</option>
            <option value="binance">Binance (crypto, public)</option>
            <option value="bybit">Bybit (crypto, public)</option>
            <option value="none">none — paper has no live data</option>
          </select>
        </Field>

        {/* Keep a spacer on the second column so the grid stays aligned when the
            right cell is empty (crypto/none have no companion field here). */}
        {isMt5 ? (
          <Field label="MetaApi token">
            <input
              name="AITRADER_DATA_PROVIDER_KEY"
              type="password"
              placeholder={configured ? "•••••••• (set — leave blank to keep)" : "MetaApi token"}
              className={inp}
            />
          </Field>
        ) : (
          // Preserve the field name so switching to crypto doesn't wipe a stored
          // token — an empty value is ignored by the action's secret handling.
          <input type="hidden" name="AITRADER_DATA_PROVIDER_KEY" value="" />
        )}

        {isMt5 && (
          <>
            <Field label="MetaApi account id">
              <input name="AITRADER_DATA_PROVIDER_ACCOUNT" defaultValue={account} placeholder="deployed MetaApi account id" className={inp} />
            </Field>
            <Field label="MetaApi region">
              <input name="AITRADER_DATA_PROVIDER_REGION" defaultValue={region || "new-york"} placeholder="new-york" className={inp} />
            </Field>
          </>
        )}

        {isCrypto && (
          <p className="text-muted-foreground sm:col-span-2 rounded-lg border border-dashed px-3 py-2 text-xs">
            Public market data — no credentials needed. Use crypto symbols in the paper assets above (e.g. BTCUSDT, ETHUSDT).
          </p>
        )}
        {isMt5 && (
          <p className="text-muted-foreground sm:col-span-2 rounded-lg border border-dashed px-3 py-2 text-xs">
            Covers the full multi-asset universe of a deployed (demo) account — forex, indices, commodities, futures, metals.
            Set the paper assets above to symbols that account offers (e.g. EURUSD, XAUUSD, US500).
          </p>
        )}
        {isNone && (
          <p className="text-muted-foreground sm:col-span-2 rounded-lg border border-dashed px-3 py-2 text-xs">
            Paper mode will run without live data — fills use only manually-set prices and charts stay empty.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-muted-foreground mb-1 block text-xs">{label}</span>
      {children}
    </label>
  );
}
