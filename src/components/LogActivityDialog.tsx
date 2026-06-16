import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { extractActivityFromImage } from "@/lib/extract-activity.functions";
import { classifyActivityIntensity } from "@/lib/classify-intensity.functions";
import { ACTIVITY_TYPES, OTHER_ACTIVITY, calcCredits, intensityForActivity, type Intensity } from "@/lib/credits";
import { AlertTriangle, Loader2, Plus, RefreshCw, Sparkles, Upload } from "lucide-react";

export default function LogActivityDialog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const extract = useServerFn(extractActivityFromImage);
  const classify = useServerFn(classifyActivityIntensity);
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);

  const [activityType, setActivityType] = useState<string>("Running");
  const [customActivity, setCustomActivity] = useState<string>("");
  const [otherIntensity, setOtherIntensity] = useState<Intensity>("medium");
  const [minutes, setMinutes] = useState<number>(45);
  const [performedAt, setPerformedAt] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [sourceApp, setSourceApp] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [classifying, setClassifying] = useState(false);

  const isOther = activityType === OTHER_ACTIVITY;
  const classifyOther = async () => {
    const name = customActivity.trim();
    if (!name) return;
    setClassifying(true);
    try {
      const out = await classify({ data: { activity: name } });
      setOtherIntensity(out.intensity);
      toast.success(`Intensity set to "${out.intensity}" (WHO guidelines).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not classify activity");
    } finally {
      setClassifying(false);
    }
  };

  const intensity: Intensity = isOther ? otherIntensity : intensityForActivity(activityType);
  const credits = calcCredits(intensity, Number(minutes) || 0);
  const lowConfidence = aiConfidence !== null && aiConfidence < 0.5;
  const canSave = !saving && !scanning && (!isOther || customActivity.trim().length > 0);
  const finalActivityType = isOther ? customActivity.trim() : activityType;

  const reset = () => {
    setActivityType("Running"); setCustomActivity(""); setOtherIntensity("medium"); setMinutes(45);
    setPerformedAt(new Date().toISOString().slice(0, 16));
    setSourceApp(""); setNotes(""); setScreenshotFile(null); setAiConfidence(null); setScanError(null);
  };

  const onFile = async (file: File) => {
    setScreenshotFile(file);
    setScanning(true);
    setScanError(null);
    setAiConfidence(null);
    try {
      const b64: string = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result).split(",")[1] ?? "");
        fr.onerror = reject;
        fr.readAsDataURL(file);
      });
      const out = await extract({ data: { imageBase64: b64, mimeType: file.type || "image/jpeg" } });
      if (out.confidence < 0.5) {
        setAiConfidence(out.confidence);
        setScanError(
          "We couldn't reliably validate this screenshot. Please re-upload a clearer image of your activity summary.",
        );
        return;
      }
      // Match AI-detected type to one of our known activities (case-insensitive),
      // otherwise fall back to "Other" with the detected name. Intensity is derived from the type.
      const match = ACTIVITY_TYPES.find(
        (t) => t.toLowerCase() === out.activity_type.toLowerCase(),
      );
      if (match) {
        setActivityType(match);
      } else if (out.activity_type) {
        setActivityType(OTHER_ACTIVITY);
        setCustomActivity(out.activity_type);
        setOtherIntensity(out.intensity);
      }
      setMinutes(out.duration_minutes);
      try {
        const d = new Date(out.performed_at);
        if (!isNaN(d.getTime())) setPerformedAt(d.toISOString().slice(0, 16));
      } catch { /* ignore */ }
      if (out.source_app) setSourceApp(out.source_app);
      if (out.notes) setNotes(out.notes);
      setAiConfidence(out.confidence);
      toast.success(`Activity detected (${Math.round(out.confidence * 100)}% confidence). Review and save.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not read screenshot";
      setScanError(`${msg}. Please re-upload a clearer screenshot of your activity.`);
      toast.error(msg);
    } finally {
      setScanning(false);
    }
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let screenshotUrl: string | null = null;
      if (screenshotFile) {
        const path = `${user.id}/${Date.now()}-${screenshotFile.name}`;
        const { error: upErr } = await supabase.storage
          .from("activity-screenshots").upload(path, screenshotFile, { upsert: false });
        if (upErr) throw upErr;
        screenshotUrl = path;
      }
      const { error } = await supabase.from("activities").insert({
        user_id: user.id,
        activity_type: finalActivityType,
        intensity,
        duration_minutes: Number(minutes),
        performed_at: new Date(performedAt).toISOString(),
        source_app: sourceApp || null,
        screenshot_url: screenshotUrl,
        notes: notes || null,
        validated: true,
      });
      if (error) throw error;
      toast.success(`+${credits} credits earned!`);
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["credit-balance"] });
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Log activity
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log a workout</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-secondary/40 px-4 py-6 text-center transition hover:bg-secondary">
            {scanning ? (
              <><Loader2 className="h-6 w-6 animate-spin text-primary" /><span className="text-sm">Reading your screenshot…</span></>
            ) : screenshotFile ? (
              <><Sparkles className="h-6 w-6 text-primary" /><span className="text-sm font-medium">{screenshotFile.name}</span><span className="text-xs text-muted-foreground">Tap to replace</span></>
            ) : (
              <><Upload className="h-6 w-6 text-muted-foreground" /><span className="text-sm font-medium">Upload activity screenshot</span><span className="text-xs text-muted-foreground">AI will auto-fill the fields</span></>
            )}
            <input
              type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }}
            />
          </label>

          {scanError && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Screenshot couldn't be validated</p>
                <p className="mt-0.5">{scanError}</p>
                <label className="mt-2 inline-flex cursor-pointer items-center gap-1 font-medium underline">
                  <RefreshCw className="h-3 w-3" /> Re-upload screenshot
                  <input
                    type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }}
                  />
                </label>
              </div>
            </div>
          )}

          {aiConfidence !== null && !scanError && (
            <div className="rounded-md bg-accent/40 px-3 py-2 text-xs text-accent-foreground">
              AI detected fields — please review before saving ({Math.round(aiConfidence * 100)}% confidence).
              {lowConfidence && " Low confidence — consider re-uploading a clearer screenshot."}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Activity</Label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t} <span className="text-xs text-muted-foreground">· {intensityForActivity(t)}</span>
                    </SelectItem>
                  ))}
                  <SelectItem value={OTHER_ACTIVITY}>Other (specify)</SelectItem>
                </SelectContent>
              </Select>
              {!isOther && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Intensity is set automatically using WHO guidelines:{" "}
                  <span className="font-medium capitalize text-foreground">{intensity}</span>.
                </p>
              )}
            </div>
            {isOther && (
              <>
                <div className="col-span-2">
                  <Label>Specify activity</Label>
                  <Input
                    placeholder="e.g. Paddleboarding, Skating…"
                    value={customActivity}
                    onChange={(e) => setCustomActivity(e.target.value)}
                    onBlur={() => void classifyOther()}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Intensity will be auto-assigned from WHO guidelines once you finish typing.
                  </p>
                </div>
                <div className="col-span-2">
                  <Label>Intensity (WHO){classifying && " — detecting…"}</Label>
                  <Select value={otherIntensity} onValueChange={(v) => setOtherIntensity(v as Intensity)}>
                    <SelectTrigger disabled={classifying}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low — leisurely, easy to talk &amp; sing</SelectItem>
                      <SelectItem value="medium">Medium — noticeable effort, can still talk</SelectItem>
                      <SelectItem value="high">High — hard effort, breathing heavily</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">Auto-assigned — adjust if needed.</p>
                </div>
              </>
            )}
            <div>
              <Label>Duration (min)</Label>
              <Input type="number" min={1} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
            </div>
            <div>
              <Label>Date & time</Label>
              <Input type="datetime-local" value={performedAt} onChange={(e) => setPerformedAt(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Source app (optional)</Label>
              <Input placeholder="Strava, Nike Run Club…" value={sourceApp} onChange={(e) => setSourceApp(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Notes (optional)</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-primary/10 to-primary-glow/10 px-4 py-3">
            <span className="text-sm text-muted-foreground">Credits to be earned</span>
            <span className="text-2xl font-bold text-primary">+{credits}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!canSave} onClick={save} className="bg-gradient-to-r from-primary to-primary-glow">
            {saving ? "Saving…" : "Save activity"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}