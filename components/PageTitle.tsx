"use client";

import { usePathname } from "next/navigation";

const TITLES: Record<string, string> = {
  "/": "Overview",
  "/users": "Users",
  "/payments": "Payments",
  "/transactions": "Transactions",
  "/services/accounts": "Accounts",
  "/services/pay": "Pay",
  "/services/wallet": "Wallet",
  "/services/cloud": "Cloud",
  "/services/survey": "Survey",
  "/services/giftcards": "Gift cards",
  "/mail": "Mail",
  "/ai": "AI",
  "/scheduler": "Scheduler",
  "/team": "People",
  "/team/teams": "Teams",
  "/team/roles": "Roles",
  "/payroll": "Payroll",
  "/payroll/advances": "Salary advances",
  "/apps": "Apps",
  "/credentials": "Credentials",
  "/audit": "Audit log",
};

export default function PageTitle() {
  const pathname = usePathname();
  const title =
    TITLES[pathname] ??
    Object.entries(TITLES).find(([href]) => href !== "/" && pathname.startsWith(href))?.[1] ??
    "Admin";
  return <span className="text-sm font-semibold">{title}</span>;
}
