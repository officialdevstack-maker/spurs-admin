import { Card, CardContent } from "@/components/ui/card";
import { Boxes } from "lucide-react";

export default function CloudAdmin() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight capitalize">cloud</h1>
        <p className="text-muted-foreground text-sm">Admin controls for Spurs Cloud.</p>
      </div>
      <Card><CardContent className="flex flex-col items-center py-16 text-center">
        <span className="bg-muted grid size-12 place-items-center rounded-full"><Boxes className="text-muted-foreground size-5" /></span>
        <p className="mt-4 text-sm font-medium">Coming soon</p>
        <p className="text-muted-foreground mt-1 max-w-xs text-sm">Full cloud admin controls land here next.</p>
      </CardContent></Card>
    </div>
  );
}
