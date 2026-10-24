import { Boxes } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import EmptyState from "@/components/page/EmptyState";

export default function CloudAdmin() {
  return (
    <Card>
      <CardContent>
        <EmptyState
          icon={Boxes}
          title="Coming soon"
          description="Full cloud admin controls land here next."
        />
      </CardContent>
    </Card>
  );
}
