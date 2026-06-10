import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { getInsights } from "@/lib/ai.functions";
import { toast } from "sonner";
import { format, subDays, startOfDay } from "date-fns";
import ReactMarkdown from "@/lib/markdown";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — StudySync AI" }] }),
  component: Analytics,
});

const COLORS = ["oklch(0.55 0.22 280)", "oklch(0.7 0.17 200)", "oklch(0.72 0.18 155)", "oklch(0.78 0.15 75)", "oklch(0.65 0.2 20)"];

function Analytics() {
  const [sessions, setSessions] = useState<{ subject: string; duration_minutes: number; created_at: string }[]>([]);
  const [tasks, setTasks] = useState<{ subject: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState("");
  const [insLoading, setInsLoading] = useState(false);
  const callInsights = useServerFn(getInsights);

  useEffect(() => {
    Promise.all([
      supabase.from("study_sessions").select("subject,duration_minutes,created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("tasks").select("subject,status"),
    ]).then(([s, t]) => {
      if (s.data) setSessions(s.data);
      if (t.data) setTasks(t.data);
      setLoading(false);
    });
  }, []);

  const bySubject = useMemo(() => {
    const map = new Map<string, { subject: string; minutes: number; completedTasks: number; pendingTasks: number }>();
    sessions.forEach((s) => {
      const r = map.get(s.subject) ?? { subject: s.subject, minutes: 0, completedTasks: 0, pendingTasks: 0 };
      r.minutes += s.duration_minutes;
      map.set(s.subject, r);
    });
    tasks.forEach((t) => {
      const r = map.get(t.subject) ?? { subject: t.subject, minutes: 0, completedTasks: 0, pendingTasks: 0 };
      if (t.status === "completed") r.completedTasks++; else r.pendingTasks++;
      map.set(t.subject, r);
    });
    return Array.from(map.values());
  }, [sessions, tasks]);

  const last7 = useMemo(() => {
    const days: { day: string; minutes: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = startOfDay(subDays(new Date(), i));
      const minutes = sessions
        .filter((s) => startOfDay(new Date(s.created_at)).getTime() === d.getTime())
        .reduce((a, b) => a + b.duration_minutes, 0);
      days.push({ day: format(d, "EEE"), minutes });
    }
    return days;
  }, [sessions]);

  const totalMin = sessions.reduce((a, b) => a + b.duration_minutes, 0);

  const handleInsights = async () => {
    setInsLoading(true);
    try {
      const { insights } = await callInsights({ data: { stats: bySubject } });
      setInsights(insights);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setInsLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Track your study habits and progress.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total focus time" value={`${Math.round(totalMin / 60)}h`} />
        <Stat label="Sessions" value={sessions.length} />
        <Stat label="Subjects" value={bySubject.length} />
        <Stat label="Tasks done" value={tasks.filter((t) => t.status === "completed").length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Last 7 days (minutes)">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={last7}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 270)" />
              <XAxis dataKey="day" stroke="currentColor" fontSize={12} />
              <YAxis stroke="currentColor" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="minutes" stroke="oklch(0.55 0.22 280)" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Time by subject">
          {bySubject.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={bySubject}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 270)" />
                <XAxis dataKey="subject" stroke="currentColor" fontSize={12} />
                <YAxis stroke="currentColor" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="minutes" fill="oklch(0.55 0.22 280)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Task split">
          {bySubject.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={bySubject} dataKey="completedTasks" nameKey="subject" outerRadius={90} label>
                  {bySubject.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="AI insights" action={
          <Button size="sm" variant="outline" onClick={handleInsights} disabled={insLoading}>
            {insLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Analyze
          </Button>
        }>
          {insights ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{insights}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Click analyze for AI recommendations on your study habits.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border bg-gradient-card p-5 shadow-card">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}
function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}
function Empty() {
  return <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">No data yet — start a Pomodoro!</div>;
}
