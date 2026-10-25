import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/page/PageHeader";
import Notice from "@/components/page/Notice";
import { requirePermission } from "@/lib/auth";
import { aitrader } from "@/lib/aitrader";
import { savePlatformSettings } from "./actions";
import { PaperDataProvider } from "./PaperDataProvider";

export const dynamic = "force-dynamic";

const inp =
  "h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:border-primary";

export default async function AiTraderSettings() {
  await requirePermission("platform.ai.manage");
  const p = await aitrader.platform();

  return (
    <form action={savePlatformSettings} className="space-y-6">
      <PageHeader title="AI Trader settings" description="Manage platform-wide trading venues, risk limits, and data access." />
      {!p && (
        <Notice tone="warning" title="AI Trader service is unavailable.">
          Check that the trading service is running and its service URL and admin credentials are configured.
        </Notice>
      )}
      <div className="text-muted-foreground text-sm">
        Platform policy enforced on every user. Users bring their own broker
        credentials in the trader app — admin never stores them here.
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Venues &amp; live trading</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Allowed venues (comma-separated)">
            <input
              name="AITRADER_ALLOWED_MODES"
              defaultValue={(p?.allowed_modes ?? ["paper", "bybit"]).join(",")}
              className={inp}
            />
          </Field>
          <Field label="Default venue">
            <select
              name="AITRADER_DEFAULT_MODE"
              defaultValue={p?.default_mode ?? "paper"}
              className={inp}
            >
              <option value="paper">paper</option>
              <option value="bybit">bybit</option>
              <option value="mt5">mt5</option>
            </select>
          </Field>
          <Field label="Allow live trading">
            <select
              name="AITRADER_ALLOW_LIVE"
              defaultValue={String(p?.allow_live ?? false)}
              className={inp}
            >
              <option value="false">false — everyone forced to dry-run</option>
              <option value="true">
                true — subscribed users may trade live
              </option>
            </select>
          </Field>
          <Field label="Default symbols (comma-separated)">
            <input
              name="AITRADER_DEFAULT_SYMBOLS"
              defaultValue={(p?.default_symbols ?? ["BTCUSDT", "ETHUSDT"]).join(
                ",",
              )}
              className={inp}
            />
          </Field>
          <Field label="Paper / MT5 fallback assets (comma-separated)">
            <input
              name="AITRADER_PAPER_SYMBOLS"
              defaultValue={(
                p?.paper_symbols ??
                p?.default_symbols ?? ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD"]
              ).join(",")}
              className={inp}
            />
          </Field>
          <Field label="Max trades / period">
            <input
              name="AITRADER_TRADE_LIMIT_PER_PERIOD"
              type="number"
              min="0"
              step="1"
              defaultValue={p?.trade_limit_per_period ?? 0}
              className={inp}
            />
          </Field>
          <Field label="Trade limit period">
            <select
              name="AITRADER_TRADE_LIMIT_PERIOD"
              defaultValue={p?.trade_limit_period ?? "month"}
              className={inp}
            >
              <option value="day">day</option>
              <option value="week">week</option>
              <option value="month">month</option>
            </select>
          </Field>
        </CardContent>
      </Card>

      <PaperDataProvider
        provider={p?.data_provider ?? "binance"}
        configured={p?.data_provider_configured ?? false}
        account={p?.data_provider_account ?? ""}
        region={p?.data_provider_region ?? "new-york"}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Risk ceilings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Max risk % / trade (cap)">
            <input
              name="AITRADER_MAX_RISK_PCT"
              type="number"
              step="0.1"
              defaultValue={p?.max_risk_pct ?? 2.0}
              className={inp}
            />
          </Field>
          <Field label="Max portfolio heat (cap, 0–1)">
            <input
              name="AITRADER_MAX_HEAT_CAP"
              type="number"
              step="0.01"
              defaultValue={p?.max_portfolio_heat ?? 0.15}
              className={inp}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          Save platform settings
        </button>
        <p className="text-muted-foreground text-xs">
          The trader service picks these up via the spurs-admin SDK and clamps
          every user to them.
        </p>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-muted-foreground mb-1 block text-xs">{label}</span>
      {children}
    </label>
  );
}
