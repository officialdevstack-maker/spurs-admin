import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ConsoleLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-label="Loading console data" role="status">
      <div className="bg-muted h-8 w-48 rounded" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index}>
            <CardHeader><div className="bg-muted h-4 w-24 rounded" /></CardHeader>
            <CardContent><div className="bg-muted h-8 w-16 rounded" /></CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><div className="bg-muted h-5 w-56 rounded" /></CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }, (_, index) => <div key={index} className="bg-muted h-12 rounded" />)}
        </CardContent>
      </Card>
      <span className="sr-only">Loading console data</span>
    </div>
  );
}
