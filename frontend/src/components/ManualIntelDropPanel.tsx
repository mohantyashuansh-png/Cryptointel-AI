import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UploadCloud, Play, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export function ManualIntelDropPanel() {
  const [url, setUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error", message: string }>({ type: "idle", message: "" });

  const handleAnalyze = async () => {
    if (!rawText.trim()) {
      setStatus({ type: "error", message: "Raw text is required for manual analysis." });
      return;
    }

    setLoading(true);
    setStatus({ type: "idle", message: "Analyzing..." });

    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_text: rawText,
          source_url: url || "Manual Entry"
        })
      });

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }
      
      setStatus({ type: "success", message: "Intelligence matrix successfully generated and injected." });
      setRawText("");
      setUrl("");
    } catch (err: any) {
      setStatus({ type: "error", message: err.message || "Failed to process intelligence." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto max-w-4xl mx-auto flex flex-col gap-6 pt-4 pb-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Manual Intel Drop</h2>
        <p className="text-muted-foreground text-sm">
          Submit raw textual intercepts or custom URLs directly into the AI parsing swarm.
        </p>
      </div>

      <Card className="border-border/50 bg-card/40">
        <CardHeader className="border-b border-border/30 bg-black/20">
          <CardTitle className="text-lg flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-primary" /> Data Submission Form
          </CardTitle>
          <CardDescription>Paste raw text and provide an optional source URL.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 flex flex-col gap-4">
          
          <div>
            <label className="text-sm font-medium mb-1 block">Source URL (Optional)</label>
            <input 
              type="text" 
              placeholder="e.g. https://pastebin.com/raw/XYZ..." 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-background border border-border/50 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Raw Intercept Text <span className="text-destructive">*</span></label>
            <textarea 
              rows={6}
              placeholder="Paste raw text here containing suspected cryptocurrency wallets, aliases, etc..." 
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full bg-background border border-border/50 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono overflow-y-auto"
            />
          </div>

          {status.type !== "idle" && (
            <div className={`p-3 rounded-md border flex items-start gap-2 text-sm ${
              status.type === "error" ? "bg-destructive/10 border-destructive/50 text-red-400" : "bg-green-500/10 border-green-500/50 text-green-400"
            }`}>
              {status.type === "error" ? <AlertCircle className="w-4 h-4 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 mt-0.5" />}
              <div>{status.message}</div>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-border/30">
            <button 
              onClick={handleAnalyze} 
              disabled={loading || !rawText.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-primary/20 text-primary font-medium rounded-md border border-primary/50 hover:bg-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {loading ? "Swarm Processing..." : "Execute Analysis"}
            </button>
          </div>

        </CardContent>
      </Card>
      
      <div className="text-xs text-muted-foreground p-4 bg-black/20 rounded border border-border/30">
        <p className="font-bold mb-1">How it works:</p>
        <p>1. The payload is sent to the local FastAPI core.</p>
        <p>2. The deterministic regex engine will instantly flag wallets.</p>
        <p>3. The 4-agent LLM swarm will structure the entities, calculate risk, and summarize context.</p>
        <p>4. The payload will be indexed in Neo4j and LanceDB.</p>
        <p className="mt-2 text-primary font-mono">Tip: Keep an eye on the Agent Traces panel for real-time logs.</p>
      </div>
    </div>
  );
}
