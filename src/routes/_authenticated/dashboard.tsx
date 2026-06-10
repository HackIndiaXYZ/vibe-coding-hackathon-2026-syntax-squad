import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Pencil, Trash2, CheckCircle2, Circle, Sparkles, Loader2, Clock, AlertCircle, RefreshCw, Eye, Save, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TaskDialog, type TaskRow, type TaskInput } from "@/components/TaskDialog";
import { TimetableDialog, type TimetableInput } from "@/components/TimetableDialog";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { generateTimetable } from "@/lib/ai.functions";
import { toast } from "sonner";
import { format, isBefore, parseISO, startOfDay } from "date-fns";
import ReactMarkdown from "@/lib/markdown";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — StudySync AI" }] }),
  component: Dashboard,
});

function Dashboard() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [aiPlan, setAiPlan] = useState<string>("");
  const [planError, setPlanError] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [ttOpen, setTtOpen] = useState(false);
  const [lastInputs, setLastInputs] = useState<TimetableInput | null>(null);
  const [editingPlan, setEditingPlan] = useState(false);
  const [planDraft, setPlanDraft] = useState("");
  const callGenerate = useServerFn(generateTimetable);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setTasks((data ?? []) as TaskRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const upsert = async (input: TaskInput): Promise<void> => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const payload = {
      title: input.title.trim(),
      description: input.description.trim() || null,
      subject: input.subject.trim() || "General",
      priority: input.priority,
      estimated_minutes: input.estimated_minutes,
      due_date: input.due_date ? new Date(input.due_date).toISOString() : null,
    };
    if (editing) {
      const { error } = await supabase.from("tasks").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Task updated");
    } else {
      const { error } = await supabase.from("tasks").insert({ ...payload, user_id: u.user.id });
      if (error) { toast.error(error.message); return; }
      toast.success("Task added");
    }
    setEditing(null);
    load();
  };

  const toggleStatus = async (t: TaskRow) => {
    const next = t.status === "completed" ? "pending" : "completed";
    const { error } = await supabase
      .from("tasks")
      .update({ status: next, completed_at: next === "completed" ? new Date().toISOString() : null })
      .eq("id", t.id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (t: TaskRow) => {
    const { error } = await supabase.from("tasks").delete().eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Task deleted");
    load();
  };

  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const completed = tasks.filter((t) => t.status === "completed").length;
    const overdue = tasks.filter(
      (t) => t.status !== "completed" && t.due_date && isBefore(parseISO(t.due_date), today),
    ).length;
    const pending = tasks.length - completed;
    return { total: tasks.length, completed, overdue, pending };
  }, [tasks]);

  const subjects = useMemo(() => Array.from(new Set(tasks.map((t) => t.subject))).slice(0, 8), [tasks]);

  const handleGenerate = async (input: TimetableInput) => {
    setGenLoading(true);
    setPlanError(null);
    try {
      const { plan } = await callGenerate({ data: input });
      setAiPlan(plan);
      setLastInputs(input);
      setEditingPlan(false);
      toast.success("Your AI study plan is ready!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to generate plan";
      setPlanError(msg);
      toast.error(msg);
      throw e;
    } finally {
      setGenLoading(false);
    }
  };

  const regenerate = async () => {
    if (!lastInputs) {
      setTtOpen(true);
      return;
    }
    try {
      await handleGenerate(lastInputs);
    } catch {
      /* surfaced via planError */
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Plan your day, focus, and stay on track.</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="bg-gradient-primary shadow-glow">
          <Plus className="mr-2 h-4 w-4" /> New task
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total tasks" value={stats.total} />
        <StatCard label="Completed" value={stats.completed} tone="success" />
        <StatCard label="Pending" value={stats.pending} />
        <StatCard label="Overdue" value={stats.overdue} tone="warning" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border bg-card p-6 shadow-card">
            <h2 className="mb-4 text-lg font-semibold">Your tasks</h2>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : tasks.length === 0 ? (
              <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
                No tasks yet — click "New task" to get started.
              </div>
            ) : (
              <ul className="space-y-2">
                {tasks.map((t) => <TaskItem key={t.id} task={t} onToggle={() => toggleStatus(t)} onEdit={() => { setEditing(t); setDialogOpen(true); }} onDelete={() => remove(t)} />)}
              </ul>
            )}
          </div>

          {/* AI plan */}
          <div className="rounded-2xl border bg-gradient-card p-6 shadow-card">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Sparkles className="h-5 w-5 text-primary" /> AI Study Plan
                </h2>
                <p className="text-xs text-muted-foreground">
                  {lastInputs
                    ? `Based on: ${lastInputs.subjects.join(", ")} · ${lastInputs.hoursPerDay}h/day`
                    : "Tell the AI what you want to study."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {aiPlan && !editingPlan && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setPlanDraft(aiPlan); setEditingPlan(true); }}
                    disabled={genLoading}
                  >
                    <Pencil className="mr-1.5 h-4 w-4" /> Edit
                  </Button>
                )}
                {aiPlan && lastInputs && (
                  <Button size="sm" variant="ghost" onClick={regenerate} disabled={genLoading}>
                    <RefreshCw className={`mr-1.5 h-4 w-4 ${genLoading ? "animate-spin" : ""}`} /> Re-generate
                  </Button>
                )}
                <Button onClick={() => setTtOpen(true)} disabled={genLoading} variant="outline" size="sm">
                  {genLoading && !lastInputs ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                  {aiPlan ? "New inputs" : "Generate"}
                </Button>
              </div>
            </div>

            {planError && (
              <div className="mb-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="flex-1">{planError}</span>
                {lastInputs && (
                  <Button size="sm" variant="ghost" onClick={regenerate} disabled={genLoading}>Retry</Button>
                )}
              </div>
            )}

            {genLoading && !aiPlan ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-10 text-sm text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span>AI is crafting your study plan…</span>
              </div>
            ) : aiPlan ? (
              editingPlan ? (
                <div className="space-y-3">
                  <Textarea
                    value={planDraft}
                    onChange={(e) => setPlanDraft(e.target.value)}
                    rows={14}
                    className="font-mono text-xs"
                  />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditingPlan(false)}>
                      <X className="mr-1.5 h-4 w-4" /> Cancel
                    </Button>
                    <Button size="sm" onClick={() => { setAiPlan(planDraft); setEditingPlan(false); toast.success("Plan updated"); }}>
                      <Save className="mr-1.5 h-4 w-4" /> Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none overflow-x-auto">
                  <ReactMarkdown>{aiPlan}</ReactMarkdown>
                </div>
              )
            ) : (
              <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
                <Eye className="mx-auto mb-2 h-5 w-5 opacity-60" />
                Click <span className="font-medium text-foreground">Generate</span> to build a personalized 7-day timetable.
              </div>
            )}
          </div>
        </div>

        {/* Pomodoro */}
        <div>
          <PomodoroTimer subject={subjects[0] ?? "General"} />
        </div>
      </div>

      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} initial={editing} onSave={upsert} />
      <TimetableDialog
        open={ttOpen}
        onOpenChange={setTtOpen}
        defaultSubjects={subjects}
        initial={lastInputs}
        onGenerate={handleGenerate}
      />
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "success" | "warning" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <div className="rounded-2xl border bg-gradient-card p-5 shadow-card">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 text-3xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}

function TaskItem({ task, onToggle, onEdit, onDelete }: { task: TaskRow; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const done = task.status === "completed";
  const overdue = !done && task.due_date && isBefore(parseISO(task.due_date), startOfDay(new Date()));
  const priColor = task.priority === "high" ? "destructive" : task.priority === "low" ? "secondary" : "default";
  return (
    <li className="group flex items-start gap-3 rounded-xl border bg-background p-3 transition hover:shadow-card">
      <button onClick={onToggle} className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary">
        {done ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Circle className="h-5 w-5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className={`flex flex-wrap items-center gap-2 ${done ? "line-through opacity-60" : ""}`}>
          <span className="font-medium">{task.title}</span>
          <Badge variant="outline" className="text-xs">{task.subject}</Badge>
          <Badge variant={priColor as never} className="text-xs capitalize">{task.priority}</Badge>
        </div>
        {task.description && <p className="mt-0.5 truncate text-xs text-muted-foreground">{task.description}</p>}
        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {task.due_date && (
            <span className={`flex items-center gap-1 ${overdue ? "text-destructive" : ""}`}>
              {overdue ? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {format(parseISO(task.due_date), "MMM d")}
            </span>
          )}
          {task.estimated_minutes && <span>{task.estimated_minutes} min</span>}
        </div>
      </div>
      <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
        <Button variant="ghost" size="icon" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </li>
  );
}
