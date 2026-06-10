import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, AlertCircle, ArrowLeft } from "lucide-react";
import { getTimetableQuestions } from "@/lib/ai.functions";

export type TimetableInput = {
  subjects: string[];
  hoursPerDay: number;
  goal?: string;
  answers?: { q: string; a: string }[];
};

export function TimetableDialog({
  open,
  onOpenChange,
  defaultSubjects,
  initial,
  onGenerate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultSubjects: string[];
  initial?: TimetableInput | null;
  onGenerate: (input: TimetableInput) => Promise<void>;
}) {
  const [step, setStep] = useState<"inputs" | "questions">("inputs");
  const [subjects, setSubjects] = useState("");
  const [hours, setHours] = useState(4);
  const [goal, setGoal] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [qLoading, setQLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const askQuestions = useServerFn(getTimetableQuestions);

  useEffect(() => {
    if (!open) return;
    setStep("inputs");
    setError(null);
    setQuestions([]);
    setAnswers([]);
    if (initial) {
      setSubjects(initial.subjects.join(", "));
      setHours(initial.hoursPerDay);
      setGoal(initial.goal ?? "");
    } else {
      setSubjects(defaultSubjects.join(", "));
      setHours(4);
      setGoal("");
    }
  }, [open, defaultSubjects, initial]);

  const parsedSubjects = subjects.split(",").map((s) => s.trim()).filter(Boolean);

  const goToQuestions = async () => {
    setError(null);
    if (parsedSubjects.length === 0) {
      setError("Please enter at least one subject.");
      return;
    }
    setQLoading(true);
    try {
      const { questions: qs } = await askQuestions({
        data: { subjects: parsedSubjects, hoursPerDay: hours, goal: goal.trim() || undefined },
      });
      if (qs.length === 0) {
        // Skip questions if AI returned none
        await runGenerate([]);
        return;
      }
      setQuestions(qs);
      setAnswers(qs.map(() => ""));
      setStep("questions");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch follow-up questions");
    } finally {
      setQLoading(false);
    }
  };

  const runGenerate = async (answerList: string[]) => {
    setError(null);
    setGenLoading(true);
    try {
      await onGenerate({
        subjects: parsedSubjects,
        hoursPerDay: hours,
        goal: goal.trim() || undefined,
        answers: questions.map((q, i) => ({ q, a: answerList[i]?.trim() || "skipped" })),
      });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate plan");
    } finally {
      setGenLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !genLoading && !qLoading && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {step === "inputs" ? "Generate AI study plan" : "A few quick questions"}
          </DialogTitle>
          <DialogDescription>
            {step === "inputs"
              ? "Tell the AI what you want to study and it will build a personalized 7-day plan."
              : "Your answers help the AI tailor the timetable to you."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === "inputs" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              goToQuestions();
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="tt-subjects">Subjects (comma separated)</Label>
              <Input
                id="tt-subjects"
                value={subjects}
                onChange={(e) => setSubjects(e.target.value)}
                placeholder="Math, Physics, History"
                required
              />
            </div>
            <div>
              <Label htmlFor="tt-hours">Hours per day: {hours}</Label>
              <Input
                id="tt-hours"
                type="range"
                min={1}
                max={12}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="tt-goal">Goal (optional)</Label>
              <Textarea
                id="tt-goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Prepare for final exams in 2 weeks"
                maxLength={500}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={qLoading}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={qLoading || parsedSubjects.length === 0}
                className="bg-gradient-primary shadow-glow"
              >
                {qLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> AI is thinking…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" /> Continue
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === "questions" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runGenerate(answers);
            }}
            className="space-y-4"
          >
            {questions.map((q, i) => (
              <div key={i}>
                <Label htmlFor={`q-${i}`} className="leading-snug">
                  {q}
                </Label>
                <Textarea
                  id={`q-${i}`}
                  value={answers[i] ?? ""}
                  onChange={(e) => {
                    const next = [...answers];
                    next[i] = e.target.value;
                    setAnswers(next);
                  }}
                  placeholder="Your answer (optional)"
                  maxLength={500}
                  rows={2}
                />
              </div>
            ))}
            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("inputs")}
                disabled={genLoading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button type="submit" disabled={genLoading} className="bg-gradient-primary shadow-glow">
                {genLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Building your plan…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" /> Generate plan
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
