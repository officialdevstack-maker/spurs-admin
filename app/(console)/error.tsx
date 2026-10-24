"use client";

import ServiceUnavailable from "@/components/page/ServiceUnavailable";

export default function ConsoleErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ServiceUnavailable service="console data" reset={reset} />;
}
