"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers, UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SubscriptionsTabs() {
  const pathname = usePathname();
  const isGrant = pathname.startsWith("/subscriptions/grant");
  const isSubs = pathname.startsWith("/subscriptions/subscribers");
  const isPlans = !isGrant && !isSubs; // list, new, and edit all live under Plans

  const tabs = [
    { label: "Plans", href: "/subscriptions", icon: Layers, active: isPlans },
    { label: "Grant to user", href: "/subscriptions/grant", icon: UserPlus, active: isGrant },
    { label: "Subscribers", href: "/subscriptions/subscribers", icon: Users, active: isSubs },
  ];

  return (
    <div className="border-b">
      <nav className="-mb-px flex gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href}
            className={cn(
              "flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm whitespace-nowrap transition-colors",
              t.active ? "border-primary text-foreground font-medium" : "text-muted-foreground hover:text-foreground border-transparent",
            )}>
            <t.icon className="size-4" />{t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
