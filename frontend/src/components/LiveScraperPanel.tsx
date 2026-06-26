import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Globe, Clock, FileText, Search, Play, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { AgentGlobe } from "./AgentGlobe";

export function LiveScraperPanel({ globalNodes = [], globalEdges = [] }: { globalNodes?: any[], globalEdges?: any[] }) {
  const [evidence, setEvidence] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showGlobe, setShowGlobe] = useState(false);
  
  const [reanalyzeStatus, setReanalyzeStatus] = useState<{type: "idle"|"loading"|"success"|"error", msg: string}>({type: "idle", msg: ""});

  const fetchEvidence = async (query = "") => {
    try {
      if (query) setIsSearching(true);
      const url = query ? `/api/v1/evidence/search?q=${encodeURIComponent(query)}` : "/api/v1/evidence";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setEvidence(data.evidence || []);
      }
    } catch (e) {
      console.error("Failed to fetch evidence");
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    fetchEvidence(searchQuery);
    if (!searchQuery) {
      const timer = setInterval(() => fetchEvidence(), 5000);
      return () => clearInterval(timer);
    }
  }, [searchQuery]);

  const handleReanalyze = async () => {
    if (!selectedItem) return;
    setReanalyzeStatus({ type: "loading", msg: "Processing..." });
    try {
      const rawText = selectedItem.text.split("=== 🕵️‍♂️ AGENT TRACE LOGS ===")[0].trim();
      const res = await fetch("/api/v1/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: rawText, source_url: selectedItem.source_url })
      });
      if (res.ok) {
        setReanalyzeStatus({ type: "success", msg: "Successfully Re-analyzed!" });
        setTimeout(() => setReanalyzeStatus({ type: "idle", msg: "" }), 3000);
      } else {
        throw new Error("Failed");
      }
    } catch (e) {
      setReanalyzeStatus({ type: "error", msg: "Error during analysis." });
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return "bg-red-500/20 text-red-500 border-red-500/50";
    if (score >= 50) return "bg-orange-500/20 text-orange-500 border-orange-500/50";
    return "bg-green-500/20 text-green-500 border-green-500/50";
  };

  return (
    <div className="flex h-full gap-4">
      {/* Index List */}
      <Card className="w-[350px] border-border/50 bg-black/40 overflow-hidden flex flex-col shrink-0">
        <CardHeader className="pb-3 border-b border-border/30 bg-secondary/20">
          <CardTitle className="text-sm font-mono text-primary flex flex-col gap-3">
            <div className="flex items-center gap-2"><Globe className="w-4 h-4" /> EVIDENCE VAULT INDEX</div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Semantic Search Vault..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background border border-border/50 rounded-md pl-8 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {isSearching && <Loader2 className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-primary animate-spin" />}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-y-auto flex-1 custom-scrollbar">
          {evidence.length === 0 ? (
            <div className="p-4 text-xs text-muted-foreground animate-pulse flex items-center justify-center h-20">Awaiting data injections...</div>
          ) : (
            <div className="divide-y divide-border/30">
              {evidence.map((item, i) => (
                <div 
                  key={i} 
                  className={`p-4 cursor-pointer transition-colors hover:bg-primary/10 ${selectedItem === item ? "bg-primary/20 border-l-2 border-primary" : ""}`}
                  onClick={() => { setSelectedItem(item); setShowGlobe(false); }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className={`text-[10px] ${getRiskColor(item.risk_score)}`}>
                      <ShieldAlert className="w-3 h-3 mr-1" /> RISK: {item.risk_score}
                    </Badge>
                    <div className="flex items-center text-[10px] text-muted-foreground gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-xs text-foreground truncate font-medium">{item.source_url}</div>
                  <div className="text-[10px] text-muted-foreground truncate mt-1.5 opacity-80">{item.text.split("=== 🕵️‍♂️ AGENT TRACE LOGS ===")[0].trim()}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Viewer */}
      <Card className="flex-1 border-border/50 bg-black/60 overflow-hidden flex flex-col">
        <CardHeader className="pb-3 border-b border-border/30 bg-secondary/20 flex flex-row justify-between items-center">
          <CardTitle className="text-sm font-mono text-primary flex items-center gap-2">
            <FileText className="w-4 h-4" /> RAW INTERCEPTED TEXT
          </CardTitle>
          {selectedItem && (
             <button 
                onClick={() => setShowGlobe(!showGlobe)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all text-xs font-mono font-bold ${showGlobe ? 'bg-primary text-black' : 'bg-primary/20 text-primary border border-primary/50 hover:bg-primary/30'}`}
             >
                <Globe className="w-3.5 h-3.5" /> {showGlobe ? "View Raw Text" : "View Global Map"}
             </button>
          )}
        </CardHeader>
        <CardContent className="p-0 overflow-hidden flex-1 flex flex-col font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed custom-scrollbar selection:bg-primary/30">
          {(!selectedItem || showGlobe) ? (
            <div className="w-full h-full relative bg-black">
               <AgentGlobe evidence={evidence} globalNodes={globalNodes} globalEdges={globalEdges} />
            </div>
          ) : (
            <div className="flex flex-col h-full p-6 overflow-y-auto">
              <div className="mb-4 flex items-center justify-between gap-2 text-muted-foreground bg-black/40 p-3 rounded-md border border-border/50 shadow-inner shrink-0">
                <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> <span className="break-all font-medium text-foreground">{selectedItem.source_url}</span></div>
                
                <button 
                  onClick={handleReanalyze}
                  disabled={reanalyzeStatus.type === "loading"}
                  className="flex items-center gap-1.5 px-3 py-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 rounded transition-colors disabled:opacity-50 font-sans"
                >
                  {reanalyzeStatus.type === "loading" ? <Loader2 className="w-3 h-3 animate-spin" /> : 
                   reanalyzeStatus.type === "success" ? <CheckCircle2 className="w-3 h-3 text-green-400" /> :
                   reanalyzeStatus.type === "error" ? <AlertCircle className="w-3 h-3 text-red-400" /> :
                   <Play className="w-3 h-3" />}
                  {reanalyzeStatus.msg || "Re-Analyze"}
                </button>
              </div>
              <div className="bg-secondary/10 p-4 rounded-md border border-border/20 shadow-sm leading-6 flex-1 overflow-y-auto">
                {(() => {
                  const raw = selectedItem.text.split("=== 🕵️‍♂️ AGENT TRACE LOGS ===")[0].trim();
                  // simple highlight of crypto addresses (heuristic for demo)
                  const parts = raw.split(/(\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b|\bbc1[a-zA-HJ-NP-Z0-9]{25,39}\b|\b0x[a-fA-F0-9]{40}\b|\b4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}\b|\bT[A-Za-z1-9]{33}\b)/g);
                  return parts.map((part: string, i: number) => {
                    if (part.match(/^([13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{25,39}|0x[a-fA-F0-9]{40}|4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}|T[A-Za-z1-9]{33})$/)) {
                      return <span key={i} className="bg-blue-500/20 text-blue-400 px-1 py-0.5 rounded font-bold border border-blue-500/30">{part}</span>;
                    }
                    return <span key={i}>{part}</span>;
                  });
                })()}
              </div>
              {selectedItem.text.includes("=== 🕵️‍♂️ AGENT TRACE LOGS ===") && (
                <div className="mt-4 pt-4 border-t border-border/50 shrink-0">
                  <div className="text-muted-foreground font-bold mb-2">Attached Trace Logs:</div>
                  <div className="bg-black/50 p-3 rounded text-[10px] text-muted-foreground max-h-32 overflow-y-auto">
                    {selectedItem.text.split("=== 🕵️‍♂️ AGENT TRACE LOGS ===")[1].trim()}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
