import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BankRow = {
  id: string;
  exam: string;
  year: string | null;
  class_level: string | null;
  subject: string;
  topic: string | null;
  question: string;
  options: string[] | null;
  answer: string | null;
  solution: string | null;
  is_pyq: boolean;
  notes: string | null;
  status: string;
  created_at: string;
};

export const listQuestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("question_bank")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { rows: (data ?? []) as BankRow[] };
  });

export const updateQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; notes?: string; status?: string }) =>
    z
      .object({
        id: z.string().uuid(),
        notes: z.string().max(4000).optional(),
        status: z.enum(["new", "reviewing", "mastered"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: { notes?: string; status?: string } = {};
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.status !== undefined) patch.status = data.status;
    const { error } = await context.supabase
      .from("question_bank")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("question_bank").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
