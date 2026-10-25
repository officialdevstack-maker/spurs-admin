"use client";

import ServiceUnavailable from "@/components/page/ServiceUnavailable";

export default function ServiceErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ServiceUnavailable service="this service" reset={reset} />;
}
