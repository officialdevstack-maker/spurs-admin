import { Boxes } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import EmptyState from "@/components/page/EmptyState";
import PageHeader from "@/components/page/PageHeader";

export default function CloudAdmin() {
  return (
    <div className="space-y-6">
      <PageHeader title="Cloud" description="Manage Spurs Cloud platform operations." />
      <Card>
        <CardContent>
          <EmptyState
            icon={Boxes}
            title="Coming soon"
            description="Full cloud admin controls land here next."
          />
        </CardContent>
      </Card>
    </div>
  );
}
