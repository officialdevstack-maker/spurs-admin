"use client";

import ServiceUnavailable from "@/components/page/ServiceUnavailable";

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ServiceUnavailable service="Payroll" reset={reset} />;
}
