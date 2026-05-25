import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReflectionsList } from "@/features/journal/components/ReflectionsList";
import { Music, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ReflectionsPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      <header className="px-6 h-20 flex items-center border-b border-white/5 sticky top-0 bg-background/80 backdrop-blur-md z-40">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="icon" asChild className="rounded-full">
              <Link href="/dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Music className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">Your Reflections</h1>
            </div>
          </div>
          <div className="hidden md:block">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
              {session.user?.name}&apos;s Journal
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <ReflectionsList />
        </div>
      </main>
    </div>
  );
}
