import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, BookMarked } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { generateQuestions, saveQuestionsToBank, type GeneratedQuestion } from "@/lib/ai.functions";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialMode?: "pyq" | "sample";
};

const EXAM_PRESETS = [
  "CBSE Class 10", "CBSE Class 12", "ICSE Class 10", "ICSE Class 12",
  "State Board (Class 1-12)",
  "JEE Main", "JEE Advanced", "NEET", "BITSAT",
  "UPSC CSE Prelims", "UPSC CSE Mains", "SSC CGL", "SSC CHSL",
  "IBPS PO", "IBPS Clerk", "SBI PO", "RBI Grade B",
  "GATE", "CAT", "CLAT", "NDA", "CDS",
  "GRE", "GMAT", "SAT", "IELTS", "TOEFL",
  "University / College course",
  "Other",
];

const AI_MODELS = [
  { label: "Google Gemini 3 Flash Preview", value: "gemini-3-flash-preview", description: "Default chat model with a strong balance of speed, capability, and cost." },
  { label: "Google Gemini 3.5 Flash", value: "gemini-3.5-flash", description: "High-efficiency Gemini 3.5 model for fast coding, reasoning, and agentic workflows." },
  { label: "Google Gemini 3.1 Pro Preview", value: "gemini-3.1-pro-preview", description: "Latest preview of Google's next-generation reasoning model." },
  { label: "Google Gemini 3.1 Flash Lite Preview", value: "gemini-3.1-flash-lite-preview", description: "Cost-efficient Gemini 3.1 preview model for high-volume chat and extraction tasks." },
  { label: "Google Gemini 2.5 Pro", value: "gemini-2.5-pro", description: "Google's strongest Gemini 2.5 model for complex reasoning and multimodal tasks." },
  { label: "Google Gemini 2.5 Flash", value: "gemini-2.5-flash", description: "Fast and efficient multimodal model for high-volume tasks." },
  { label: "Google Gemini 2.5 Flash Lite", value: "gemini-2.5-flash-lite", description: "Lightweight version of Gemini Flash for cost-effective processing." },
  { label: "OpenAI GPT-5.5", value: "gpt-5.5", description: "OpenAI's most capable GPT-5.5 model for demanding reasoning and coding tasks." },
  { label: "OpenAI GPT-5.5 Pro", value: "gpt-5.5-pro", description: "Premium GPT-5.5 variant with extended reasoning for the hardest problems." },
  { label: "OpenAI GPT-5.4", value: "gpt-5.4", description: "Advanced GPT-5.4 reasoning model for complex analysis and code generation." },
  { label: "OpenAI GPT-5.4 Pro", value: "gpt-5.4-pro", description: "Premium GPT-5.4 variant with enhanced reasoning for complex tasks." },
  { label: "OpenAI GPT-5.4 Mini", value: "gpt-5.4-mini", description: "Smaller, faster GPT-5.4 variant balancing reasoning quality and cost." },
  { label: "OpenAI GPT-5.4 Nano", value: "gpt-5.4-nano", description: "Fastest and lowest-cost GPT-5.4 variant for high-volume tasks." },
  { label: "OpenAI GPT-5.2", value: "gpt-5.2", description: "OpenAI reasoning model for complex problem-solving tasks." },
  { label: "OpenAI GPT-5", value: "gpt-5", description: "Powerful all-rounder for reasoning, long-context, and multimodal tasks." },
  { label: "OpenAI GPT-5 Mini", value: "gpt-5-mini", description: "Smaller, faster GPT-5 model for efficient tasks." },
  { label: "OpenAI GPT-5 Nano", value: "gpt-5-nano", description: "Most compact GPT-5 model for speed and cost efficiency." },
];

export function PYQDialog({ open, onOpenChange, initialMode = "pyq" }: Props) {
  const [mode, setMode] = useState<"pyq" | "sample">(initialMode);
  const [exam, setExam] = useState("JEE Main");
  const [customExam, setCustomExam] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [year, setYear] = useState("");
  const [syllabus, setSyllabus] = useState("");
  const [count, setCount] = useState(5);
  const [selectedModel, setSelectedModel] = useState("gemini-3-flash-preview");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const gen = useServerFn(generateQuestions);
  const save = useServerFn(saveQuestionsToBank);

  const effectiveExam = exam === "Other" ? customExam.trim() : exam;
  const selectedModelInfo = AI_MODELS.find((m) => m.value === selectedModel) ?? AI_MODELS[0];

  const reset = () => {
    setQuestions([]);
    setSelected(new Set());
  };

  const handleGenerate = async () => {
    if (!effectiveExam) return toast.error("Please name the exam");
    if (!subject.trim()) return toast.error("Please enter a subject");
    setLoading(true);
    try {
      const res = await gen({
        data: {
          mode,
          exam: effectiveExam,
          classLevel: classLevel || undefined,
          subject: subject.trim(),
          topic: topic.trim() || undefined,
          year: year.trim() || undefined,
          syllabus: syllabus.trim() || undefined,
          count,
          model: selectedModel,
        },
      });
      if (!res.questions.length) {
        toast.error("No questions generated. Try again with more details.");
      } else {
        setQuestions(res.questions);
        setSelected(new Set(res.questions.map((_, i) => i)));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const toSave = questions.filter((_, i) => selected.has(i));
    if (!toSave.length) return toast.error("Select at least one question");
    setSaving(true);
    try {
      const res = await save({
        data: {
          mode,
          exam: effectiveExam,
          year: year || undefined,
          classLevel: classLevel || undefined,
          subject: subject.trim(),
          questions: toSave,
        },
      });
      toast.success(`Saved ${res.saved} question${res.saved === 1 ? "" : "s"} to your bank`);
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggle = (i: number) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {mode === "pyq" ? "Previous Year Questions" : "Sample Questions"}
          </DialogTitle>
          <DialogDescription>
            Tell me which exam, year, subject, and syllabus to use. Use the exact subject name and exam level so the questions match your target syllabus.
            The generator will aim for unique, professional exam-style questions with difficulty labels and step-by-step solutions.
          </DialogDescription>
        </DialogHeader>

        {!questions.length ? (
          <div className="space-y-3">
            <div className="flex gap-2 rounded-lg bg-muted p-1">
              <button
                onClick={() => setMode("pyq")}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${mode === "pyq" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              >
                Previous Year (PYQ)
              </button>
              <button
                onClick={() => setMode("sample")}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${mode === "sample" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              >
                Sample / Practice
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Exam</Label>
                <Select value={exam} onValueChange={setExam}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {EXAM_PRESETS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
                {exam === "Other" && (
                  <Input className="mt-2" placeholder="e.g. RRB NTPC" value={customExam} onChange={(e) => setCustomExam(e.target.value)} />
                )}
              </div>
              <div>
                <Label>Class / Level (optional)</Label>
                <Input placeholder="e.g. Class 8, B.Tech 2nd year" value={classLevel} onChange={(e) => setClassLevel(e.target.value)} />
              </div>
              <div>
                <Label>Subject</Label>
                <Input placeholder="e.g. Physics, History, Reasoning" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div>
                <Label>Topic (optional)</Label>
                <Input placeholder="e.g. Kinematics, Mughal Empire" value={topic} onChange={(e) => setTopic(e.target.value)} />
              </div>
              <div>
                <Label>{mode === "pyq" ? "Year / Paper" : "Target year (optional)"}</Label>
                <Input placeholder="e.g. 2023, 2019-2023" value={year} onChange={(e) => setYear(e.target.value)} />
              </div>
              <div>
                <Label>Number of questions</Label>
                <Input type="number" min={1} max={100} value={count} onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 5)))} />
                <p className="mt-1 text-xs text-muted-foreground">Generate up to 100 questions. For PYQ, choose 1 to request a single paper-style set or increase the count for more questions.</p>
              </div>
            </div>

            <div>
              <Label>AI Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {AI_MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">{selectedModelInfo.description}</p>
            </div>

            <div>
              <Label>Syllabus / scope (optional)</Label>
              <Textarea
                rows={2}
                placeholder="e.g. NCERT Class 10 Science chapters 1-6"
                value={syllabus}
                onChange={(e) => setSyllabus(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleGenerate} disabled={loading} className="bg-gradient-primary shadow-glow">
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…</> : <>Generate</>}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {questions.length} question{questions.length === 1 ? "" : "s"} generated. Tick the ones to keep, then save to your bank.
            </div>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {questions.map((q, i) => (
                <label key={i} className={`block cursor-pointer rounded-lg border p-3 transition ${selected.has(i) ? "border-primary bg-primary/5" : ""}`}>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} className="mt-1" />
                    <div className="flex-1 space-y-1.5 text-sm">
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        {q.year && <span className="rounded bg-muted px-1.5 py-0.5">{q.year}</span>}
                        {q.topic && <span className="rounded bg-muted px-1.5 py-0.5">{q.topic}</span>}
                        {q.difficulty && <span className="rounded bg-muted px-1.5 py-0.5">{q.difficulty}</span>}
                      </div>
                      <div className="font-medium">{q.question}</div>
                      {q.options?.length ? (
                        <ul className="ml-1 space-y-0.5 text-muted-foreground">
                          {q.options.map((o, j) => <li key={j}>{o}</li>)}
                        </ul>
                      ) : null}
                      {q.answer && <div className="text-xs"><b>Answer:</b> {q.answer}</div>}
                      {q.solution && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-primary">Show worked solution</summary>
                          <div className="mt-1 whitespace-pre-wrap text-muted-foreground">{q.solution}</div>
                        </details>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={reset}>Back</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary shadow-glow">
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : <><BookMarked className="mr-2 h-4 w-4" /> Save to bank</>}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
