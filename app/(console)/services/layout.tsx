import WorkspaceHeader from "@/components/shell/WorkspaceHeader";

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <WorkspaceHeader />
      {children}
    </div>
  );
}
