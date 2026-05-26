import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SongSearch } from "@/features/songs/components/SongSearch";
import { getJournalEntriesAction } from "@/server/actions/journal.actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronRight, Music, ListMusic } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const recentEntries = await getJournalEntriesAction();

  return (
    <div className="container mx-auto py-6 md:py-10 px-4 md:px-6 space-y-10 md:space-y-16">
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gradient text-balance">Welcome back, {session.user?.name}</h1>
          <p className="text-muted-foreground text-base md:text-lg">What&apos;s the soundtrack to your thoughts today?</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
          <Button size="lg" variant="outline" asChild className="rounded-2xl h-12 md:h-14 px-6 md:px-8 border-white/10 hover:bg-white/5 w-full sm:w-auto">
            <Link href="/playlists">
              <ListMusic className="mr-2 h-4 w-4" />
              Your Playlists
            </Link>
          </Button>
          <Button size="lg" asChild className="rounded-2xl h-12 md:h-14 px-6 md:px-8 shadow-xl shadow-primary/20 w-full sm:w-auto">
            <Link href="/reflections">
              View All Reflections
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Reduced mobile padding (p-3) and radius (rounded-2xl) to give SongSearch more width on small screens */}
      <section className="space-y-6 md:space-y-8 bg-secondary/10 p-3 sm:p-6 md:p-12 rounded-2xl md:rounded-[2.5rem] border border-white/5 overflow-hidden">
        <div className="flex items-center gap-3 mb-2 px-1 md:px-0">
           <div className="p-2 rounded-xl bg-primary/10">
             <Music className="h-5 w-5 text-primary" />
           </div>
           <h2 className="text-xl md:text-2xl font-bold tracking-tight">Search & Journal</h2>
        </div>
        <SongSearch />
      </section>

      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Recent Reflections</h2>
          <Button variant="link" asChild className="text-muted-foreground hover:text-primary">
            <Link href="/reflections">View all</Link>
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {recentEntries.length === 0 ? (
            <div className="col-span-full py-12 text-center glass rounded-3xl border-dashed border-2 border-white/5">
              <p className="text-muted-foreground italic">No journal entries yet. Start by searching for a song above.</p>
            </div>
          ) : (
            recentEntries.slice(0, 3).map((entry) => (
              <Card key={entry.id} className="glass border-white/5 hover:border-white/10 transition-all group rounded-3xl overflow-hidden shadow-lg flex flex-col h-full">
                <CardHeader className="flex flex-row items-center gap-4 pb-4 shrink-0">
                  <div className="h-12 w-12 rounded-xl bg-secondary overflow-hidden shrink-0 shadow-md">
                    {entry.song.coverArt && <img src={entry.song.coverArt} alt={entry.song.title} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <CardTitle className="text-sm font-bold truncate pr-2">{entry.song.title}</CardTitle>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate">{entry.song.artist}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                  {/* Safely rendering HTML with line-clamp so it truncates perfectly */}
                  <div 
                    className="text-sm line-clamp-3 italic text-foreground/80 font-serif leading-relaxed prose prose-invert prose-sm"
                    dangerouslySetInnerHTML={{ __html: entry.content }}
                  />
                  <div className="flex justify-end pt-2">
                    <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                      {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  );
}