import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listQuestions, updateQuestion, deleteQuestion, type BankRow } from "@/lib/qbank.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Library, Loader2, Plus, Search, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { PYQDialog } from "@/components/PYQDialog";

export const Route = createFileRoute("/_authenticated/question-bank")({
  head: () => ({ meta: [{ title: "Question Bank — StudySync AI" }] }),
  component: QuestionBankPage,
});

function QuestionBankPage() {
  const load = useServerFn(listQuestions);
  const update = useServerFn(updateQuestion);
  const remove = useServerFn(deleteQuestion);

  const [rows, setRows] = useState<BankRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "pyq" | "sample">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "new" | "reviewing" | "mastered">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"pyq" | "sample">("pyq");

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await load();
      setRows(res.rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterMode === "pyq" && !r.is_pyq) return false;
      if (filterMode === "sample" && r.is_pyq) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (!term) return true;
      return [r.question, r.subject, r.topic, r.exam, r.year, r.notes, r.answer]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(term));
    });
  }, [rows, q, filterMode, filterStatus]);

  const handleNotesSave = async (id: string, notes: string) => {
    try {
      await update({ data: { id, notes } });
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, notes } : r)));
      toast.success("Notes saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleStatus = async (id: string, status: "new" | "reviewing" | "mastered") => {
    try {
      await update({ data: { id, status } });
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    try {
      await remove({ data: { id } });
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const openDialog = (mode: "pyq" | "sample") => {
    setDialogMode(mode);
    setDialogOpen(true);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
            <Library className="h-6 w-6 text-primary md:h-7 md:w-7" /> Question Bank
          </h1>
          <p className="text-xs text-muted-foreground md:text-sm">
            Searchable PYQs & sample questions with worked solutions and your progress notes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openDialog("sample")}>
            <Plus className="mr-1 h-4 w-4" /> Sample Qs
          </Button>
          <Button onClick={() => openDialog("pyq")} className="bg-gradient-primary shadow-glow">
            <Plus className="mr-1 h-4 w-4" /> PYQ
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border bg-card p-3 shadow-card">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search question, subject, exam, topic, notes…"
            className="pl-8"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={filterMode} onValueChange={(v) => setFilterMode(v as typeof filterMode)}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="pyq">PYQ only</SelectItem>
            <SelectItem value="sample">Sample only</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="reviewing">Reviewing</SelectItem>
            <SelectItem value="mastered">Mastered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground shadow-card">
          {rows.length === 0
            ? "Your bank is empty. Click PYQ or Sample Qs to generate and save questions."
            : "No questions match your filters."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <QuestionCard
              key={r.id}
              row={r}
              onNotesSave={handleNotesSave}
              onStatus={handleStatus}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <PYQDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) void refresh();
        }}
        initialMode={dialogMode}
      />
    </div>
  );
}

function QuestionCard({
  row,
  onNotesSave,
  onStatus,
  onDelete,
}: {
  row: BankRow;
  onNotesSave: (id: string, notes: string) => void;
  onStatus: (id: string, status: "new" | "reviewing" | "mastered") => void;
  onDelete: (id: string) => void;
}) {
  const [notes, setNotes] = useState(row.notes ?? "");
  const dirty = notes !== (row.notes ?? "");

  return (
    <div className="rounded-xl border bg-card p-4 shadow-card">
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
        <span className={`rounded px-1.5 py-0.5 font-medium ${row.is_pyq ? "bg-primary/10 text-primary" : "bg-muted"}`}>
          {row.is_pyq ? "PYQ" : "Sample"}
        </span>
        <span className="rounded bg-muted px-1.5 py-0.5">{row.exam}</span>
        {row.year && <span className="rounded bg-muted px-1.5 py-0.5">{row.year}</span>}
        <span className="rounded bg-muted px-1.5 py-0.5">{row.subject}</span>
        {row.topic && <span className="rounded bg-muted px-1.5 py-0.5">{row.topic}</span>}
        {row.class_level && <span className="rounded bg-muted px-1.5 py-0.5">{row.class_level}</span>}
        <div className="ml-auto flex items-center gap-1">
          <Select value={row.status} onValueChange={(v) => onStatus(row.id, v as "new" | "reviewing" | "mastered")}>
            <SelectTrigger className="h-7 w-[120px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="reviewing">Reviewing</SelectItem>
              <SelectItem value="mastered">Mastered</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(row.id)}>
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      </div>

      <div className="font-medium">{row.question}</div>
      {row.options?.length ? (
        <ul className="mt-1 ml-1 space-y-0.5 text-sm text-muted-foreground">
          {row.options.map((o, i) => <li key={i}>{o}</li>)}
        </ul>
      ) : null}
      {row.answer && (
        <div className="mt-2 text-sm"><b>Answer:</b> {row.answer}</div>
      )}
      {row.solution && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-primary">Show worked solution & steps</summary>
          <div className="mt-1 whitespace-pre-wrap text-muted-foreground">{row.solution}</div>
        </details>
      )}

      <div className="mt-3">
        <Textarea
          rows={2}
          placeholder="Your notes (mistakes, tricks, why answer is X)…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        {dirty && (
          <div className="mt-1 flex justify-end">
            <Button size="sm" variant="outline" onClick={() => onNotesSave(row.id, notes)}>
              <Save className="mr-1 h-3 w-3" /> Save notes
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
