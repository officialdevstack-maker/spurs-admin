"use client";

import { Button } from "@/components/ui/button";
import Notice from "@/components/page/Notice";

export default function ServiceUnavailable({
  service,
  reset,
}: {
  service: string;
  reset: () => void;
}) {
  return (
    <div role="alert" className="mx-auto max-w-2xl py-10">
      <Notice tone="danger" title={`Couldn't reach ${service}.`}>
        Check that the service is running and its admin connection is configured correctly.
      </Notice>
      <Button className="mt-4" variant="outline" onClick={reset}>Try again</Button>
    </div>
  );
}
