import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db, apps as appsTable } from "@/lib/db";
import { listCredentials } from "@/lib/credentials";

export default async function AppsPage() {
  const [apps, creds] = await Promise.all([
    db.select().from(appsTable),
    listCredentials(),
  ]);
  const countFor = (id: string) => creds.filter((c) => c.appId === id).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Apps</h1>
        <p className="text-muted-foreground text-sm">Every Spurs Cloud service admin governs.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((a) => (
          <Card key={a.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{a.name}</CardTitle>
                <Badge variant="secondary">{a.id}</Badge>
              </div>
              <CardDescription>{a.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{countFor(a.id)} credentials</span>
              {a.baseUrl && (
                <a href={a.baseUrl} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 hover:underline">
                  Open <ExternalLink className="size-3" />
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
