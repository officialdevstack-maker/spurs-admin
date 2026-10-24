import "server-only";
import { hasPermission } from "@/lib/permissions";
import type { Held } from "@/lib/workspaces";
import { giftcards } from "@/lib/sdk/giftcards";
import { survey } from "@/lib/sdk/survey";
import { countPendingAdvances } from "@/lib/payroll/staff-data";

export type InboxQueueId = "cashouts" | "submissions" | "giftcards" | "advances";

export interface InboxQueueCount {
  id: InboxQueueId;
  label: string;
  service: string;
  href: string;
  count: number | null;
  error?: string;
}

const QUEUES: Omit<InboxQueueCount, "count" | "error">[] = [
  { id: "cashouts", label: "Cash-outs", service: "Earn", href: "/services/survey/cashouts" },
  { id: "submissions", label: "Task submissions", service: "Earn", href: "/services/survey/review" },
  { id: "giftcards", label: "Gift card trades", service: "Gift Cards", href: "/services/giftcards/review" },
  { id: "advances", label: "Salary advances", service: "Payroll", href: "/payroll/advances" },
];

const PERMISSIONS: Record<InboxQueueId, string> = {
  cashouts: "money.payouts.approve",
  submissions: "ops.review",
  giftcards: "ops.review",
  advances: "payroll.advances",
};

export interface InboxQueueSummary {
  queues: InboxQueueCount[];
  total: number | null;
  incomplete: boolean;
}

const settle = <T>(promise: Promise<T>) =>
  Promise.allSettled([promise]).then(([result]) => result);

export async function getInboxQueueCounts(permissions: Held): Promise<InboxQueueSummary> {
  const visible = QUEUES.filter((queue) => hasPermission(permissions, PERMISSIONS[queue.id]));
  const surveyQueues = visible.filter((queue) => queue.id === "cashouts" || queue.id === "submissions");
  const [surveyResult, giftcardsResult, advancesResult] = await Promise.all([
    surveyQueues.length ? settle(survey.inboxCounts()) : Promise.resolve(null),
    visible.some((queue) => queue.id === "giftcards") ? settle(giftcards.pendingReviewCount()) : Promise.resolve(null),
    visible.some((queue) => queue.id === "advances") ? settle(countPendingAdvances()) : Promise.resolve(null),
  ]);

  const queues = visible.map((queue): InboxQueueCount => {
    if (queue.id === "cashouts" || queue.id === "submissions") {
      if (surveyResult?.status === "fulfilled") {
        return { ...queue, count: surveyResult.value[queue.id] };
      }
      if (surveyResult?.status === "rejected") {
        console.error(`Failed to fetch the ${queue.label} inbox count:`, surveyResult.reason);
      }
    } else if (queue.id === "giftcards") {
      if (giftcardsResult?.status === "fulfilled") return { ...queue, count: giftcardsResult.value };
      if (giftcardsResult?.status === "rejected") {
        console.error(`Failed to fetch the ${queue.label} inbox count:`, giftcardsResult.reason);
      }
    } else {
      if (advancesResult?.status === "fulfilled") return { ...queue, count: advancesResult.value };
      if (advancesResult?.status === "rejected") {
        console.error(`Failed to fetch the ${queue.label} inbox count:`, advancesResult.reason);
      }
    }
    return {
      ...queue,
      count: null,
      error: `Couldn't reach ${queue.service}. Check the service connection and try again.`,
    };
  });

  const incomplete = queues.some((queue) => queue.count === null);
  const total = incomplete ? null : queues.reduce((sum, queue) => sum + (queue.count ?? 0), 0);
  return { queues, total, incomplete };
}
