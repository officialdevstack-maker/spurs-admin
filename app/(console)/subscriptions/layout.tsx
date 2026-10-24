import SubscriptionsTabs from "./SubscriptionsTabs";

export default function SubscriptionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
        <p className="text-muted-foreground text-sm">Paid plans across apps. Charged via Spurs Pay (wallet, gift card, card).</p>
      </div>
      <SubscriptionsTabs />
      {children}
    </div>
  );
}
