"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Music, PenLine, Sparkles, Heart } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Resonance",
    "operatingSystem": "Web",
    "applicationCategory": "LifestyleApplication, MusicApplication",
    "description": "Premium music journaling platform with AI-powered emotional analysis.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="px-4 lg:px-6 h-14 flex items-center border-b border-white/5 sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="flex items-center justify-center">
          <Music className="h-6 w-6 mr-2 text-primary" />
          <span className="font-bold text-xl tracking-tight">Resonance</span>
        </div>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Button variant="ghost" size="sm" onClick={() => router.push("/auth/login")}>
            Sign In
          </Button>
          <Button size="sm" onClick={() => router.push("/auth/signup")}>
            Get Started
          </Button>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 flex flex-col items-center justify-center text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-4 max-w-3xl"
          >
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl text-gradient">
              Your Soul&apos;s Soundtrack, <br />
              Deeply Explored.
            </h1>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Resonance is a premium music journaling platform that uses AI to help you uncover the emotional depths of the music you love.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Button size="lg" className="h-12 px-8 text-base" onClick={() => router.push("/auth/signup")}>
                Start Journaling
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base glass" onClick={() => router.push("#features")}>
                Explore Features
              </Button>
            </div>
          </motion.div>
        </section>

        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-secondary/30">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-12 lg:grid-cols-3">
              <FeatureCard
                icon={<Sparkles className="h-10 w-10 text-primary" />}
                title="AI Meaning Analysis"
                description="Our AI dives deep into lyrics and melodies to provide nuanced emotional analysis and song meanings."
              />
              <FeatureCard
                icon={<PenLine className="h-10 w-10 text-primary" />}
                title="Personal Journaling"
                description="Connect your memories and reflections to the songs that soundtracked your life."
              />
              <FeatureCard
                icon={<Heart className="h-10 w-10 text-primary" />}
                title="Emotional Insights"
                description="Track your emotional journey through music with monthly recaps and trend analysis."
              />
            </div>
          </div>
        </section>
      </main>
      <footer className="py-6 w-full shrink-0 items-center px-4 md:px-6 border-t border-white/5">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © 2026 Resonance. All rights reserved.
          </p>
          <nav className="flex gap-4 sm:gap-6">
            <Button variant="link" size="sm" className="text-xs text-muted-foreground p-0 h-auto">Terms</Button>
            <Button variant="link" size="sm" className="text-xs text-muted-foreground p-0 h-auto">Privacy</Button>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl glass border-white/5"
    >
      <div className="p-3 rounded-full bg-primary/10">{icon}</div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </motion.div>
  );
}
