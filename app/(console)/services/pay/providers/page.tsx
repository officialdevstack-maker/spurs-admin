import { EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { can, requirePermission } from "@/lib/auth";
import { resolveConfig } from "@/lib/credentials";
import { providerStates } from "@/lib/pay-providers";
import ProvidersManager from "./ProvidersManager";

export const dynamic = "force-dynamic";

export default async function PayProviders() {
  await requirePermission("platform.credentials.manage");
  const canEdit = await can("platform.credentials.manage");
  const cfg = await resolveConfig("pay");
  const providers = providerStates(cfg);
  const current = providers.some((p) => p.id === cfg.PAY_PROVIDER)
    ? cfg.PAY_PROVIDER
    : "sandbox";

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        The real gateway behind Spurs Pay. Choose the live processor, edit its
        credentials and deposit fee, and generate the webhook URL — all served
        to Pay from admin and hidden from merchants.
      </p>

      <ProvidersManager
        providers={providers}
        current={current}
        canEdit={canEdit}
      />

      <Card>
        <CardContent className="text-muted-foreground flex items-center gap-3 py-4 text-sm">
          <EyeOff className="size-4 shrink-0" />
          Merchants and customers never see which processor is active — Spurs
          Pay presents one consistent API and checkout regardless of the
          provider behind it.
        </CardContent>
      </Card>
    </div>
  );
}
