import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, Calendar, BarChart3, Bot, Timer, Sparkles, GraduationCap, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StudySync AI — Smart study planner for ambitious students" },
      { name: "description", content: "AI-powered study planner with Pomodoro timer, analytics, and a personal study coach. Plan smarter, study less, achieve more." },
      { property: "og:title", content: "StudySync AI — Smart study planner" },
      { property: "og:description", content: "AI-powered study planner with Pomodoro timer, analytics, and a personal study coach." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Brain, title: "AI Study Plans", desc: "Personalized weekly timetables generated from your subjects and free hours." },
  { icon: Timer, title: "Pomodoro Timer", desc: "Built-in 25/5 focus sessions tracked per subject." },
  { icon: BarChart3, title: "Smart Analytics", desc: "Visualize study time, progress, and weak subjects." },
  { icon: Bot, title: "AI Coach", desc: "Chat with an AI tutor for study help and productivity tips." },
  { icon: Calendar, title: "Tasks & Deadlines", desc: "Never miss an assignment with priorities and due dates." },
  { icon: Sparkles, title: "Daily Insights", desc: "AI-generated motivation and recommendations every day." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">StudySync<span className="text-gradient"> AI</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
            <Link to="/auth"><Button>Get started</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10" />
        <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -right-32 top-40 h-72 w-72 rounded-full bg-primary-glow/20 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 text-center sm:px-6 sm:py-32">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-xs font-medium shadow-card">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Powered by AI
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Study smarter with your<br />
            <span className="text-gradient">personal AI coach</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            StudySync AI builds a personalized timetable, tracks your focus, and turns hours of stress into a clear plan you can actually follow.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/auth">
              <Button size="lg" className="min-w-48 bg-gradient-primary shadow-glow">
                Start studying free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="min-w-48">See demo</Button>
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" />Free to start</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" />No credit card</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" />Built for students</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need to ace the semester</h2>
          <p className="mt-3 text-muted-foreground">Built for hackathon-grade focus and finals-grade ambition.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="group rounded-2xl border bg-gradient-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-glow">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
                  <Icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 pb-24 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-10 text-center shadow-glow sm:p-16">
          <div className="absolute inset-0 bg-foreground/10" />
          <div className="relative">
            <h2 className="text-3xl font-bold text-primary-foreground sm:text-4xl">Ready to transform how you study?</h2>
            <p className="mt-3 text-primary-foreground/90">Join students using AI to learn faster and stress less.</p>
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="mt-8 min-w-48">
                Get started — it's free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} StudySync AI. Built for ambitious students.
      </footer>
    </div>
  );
}
