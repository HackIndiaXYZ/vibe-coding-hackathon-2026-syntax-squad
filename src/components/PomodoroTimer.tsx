import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Mode = "focus" | "break";

export function PomodoroTimer({
  subject = "General",
  onComplete,
}: {
  subject?: string;
  onComplete?: () => void;
}) {
  const [mode, setMode] = useState<Mode>("focus");
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const tickRef = useRef<number | null>(null);

  const total = mode === "focus" ? 25 * 60 : 5 * 60;

  const handleFinish = useCallback(async () => {
    if (mode === "focus") {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (u.user) {
          await supabase.from("study_sessions").insert({
            user_id: u.user.id,
            subject,
            duration_minutes: 25,
          });
        }
        toast.success("Focus session complete! Take a 5-min break.");
        onComplete?.();
      } catch {
        toast.error("Could not save session");
      }
      setMode("break");
      setSeconds(5 * 60);
    } else {
      toast.success("Break over — ready for another sprint?");
      setMode("focus");
      setSeconds(25 * 60);
    }
  }, [mode, subject, onComplete]);

  useEffect(() => {
    if (!running) return;
    tickRef.current = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          window.clearInterval(tickRef.current!);
          setRunning(false);
          handleFinish();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [running, handleFinish]);

  const reset = () => {
    setRunning(false);
    setSeconds(mode === "focus" ? 25 * 60 : 5 * 60);
  };

  const switchMode = (m: Mode) => {
    setRunning(false);
    setMode(m);
    setSeconds(m === "focus" ? 25 * 60 : 5 * 60);
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const pct = ((total - seconds) / total) * 100;

  return (
    <div className="rounded-2xl bg-gradient-card p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Pomodoro
        </h3>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => switchMode("focus")}
            className={`rounded px-3 py-1 text-xs font-medium ${mode === "focus" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            Focus
          </button>
          <button
            onClick={() => switchMode("break")}
            className={`rounded px-3 py-1 text-xs font-medium ${mode === "break" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            Break
          </button>
        </div>
      </div>

      <div className="relative mx-auto my-6 flex h-48 w-48 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-muted"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="url(#g)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - pct / 100)}`}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="oklch(0.55 0.22 280)" />
              <stop offset="100%" stopColor="oklch(0.72 0.18 300)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="text-center">
          <div className="text-5xl font-bold tabular-nums tracking-tight">
            {mm}:{ss}
          </div>
          <div className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            {mode === "break" && <Coffee className="h-3 w-3" />}
            {mode === "focus" ? subject : "Break time"}
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-2">
        <Button onClick={() => setRunning((r) => !r)} className="min-w-28">
          {running ? (
            <>
              <Pause className="mr-2 h-4 w-4" /> Pause
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" /> Start
            </>
          )}
        </Button>
        <Button variant="outline" size="icon" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
