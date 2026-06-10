import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — StudySync AI" }] }),
  component: Settings,
});

function Settings() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const [fullName, setFullName] = useState("");
  const [hours, setHours] = useState(4);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name,daily_study_hours").eq("id", user.id).maybeSingle().then(({ data }) => {
      setFullName(data?.full_name ?? "");
      setHours(data?.daily_study_hours ?? 4);
      setLoading(false);
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName.trim(),
      daily_study_hours: hours,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile and preferences.</p>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-card">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
            <UserIcon className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold">{fullName || "Student"}</div>
            <div className="text-sm text-muted-foreground">{user?.email}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" maxLength={80} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="hours">Daily study hours target</Label>
            <Input id="hours" type="number" min={1} max={16} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
            <p className="mt-1 text-xs text-muted-foreground">Used by the AI to plan your timetable.</p>
          </div>
          <Button onClick={save} disabled={saving} className="bg-gradient-primary shadow-glow">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save changes
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-card">
        <h2 className="mb-4 text-lg font-semibold">Preferences</h2>
        <div className="flex items-center justify-between">
          <div>
            <Label>Dark mode</Label>
            <p className="text-xs text-muted-foreground">Easier on the eyes during late-night study sessions.</p>
          </div>
          <Switch checked={theme === "dark"} onCheckedChange={toggle} />
        </div>
      </div>
    </div>
  );
}
