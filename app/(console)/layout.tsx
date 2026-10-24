import { requireAdmin } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import PageTitle from "@/components/PageTitle";
import ThemeToggle from "@/components/ThemeToggle";
import AdminMenu from "@/components/AdminMenu";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="bg-background min-h-screen">
      <Sidebar />
      <div className="flex min-h-screen flex-col md:pl-60">
        <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 flex h-16 items-center gap-2 border-b px-3 backdrop-blur sm:px-6">
          <MobileNav />
          <PageTitle />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <div className="bg-border mx-1 hidden h-6 w-px sm:block" />
            <AdminMenu email={admin.email} role={admin.role} />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
