import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TerminalSquare, Cpu, Globe, Clock, ChevronRight, Search } from "lucide-react";

export function AgentTracesPanel() {
  const [evidence, setEvidence] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchEvidence = async () => {
      try {
        const res = await fetch("/api/v1/evidence");
        if (res.ok) {
          const data = await res.json();
          // Filter to only items that have agent traces
          const traces = (data.evidence || []).filter((e: any) => e.text && e.text.includes("=== 🕵️‍♂️ AGENT TRACE LOGS ==="));
          setEvidence(traces);
        }
      } catch (e) {
        console.error("Failed to fetch evidence");
      }
    };
    fetchEvidence();
    const timer = setInterval(fetchEvidence, 5000);
    return () => clearInterval(timer);
  }, []);

  const parseTraces = (fullText: string) => {
    const parts = fullText.split("=== 🕵️‍♂️ AGENT TRACE LOGS ===");
    return {
      rawText: parts[0]?.trim() || "",
      traces: parts[1]?.trim() || ""
    };
  };

  return (
    <div className="flex h-full gap-4">
      {/* List */}
      <Card className="w-[350px] border-border/50 bg-black/40 overflow-hidden flex flex-col shrink-0">
        <CardHeader className="pb-3 border-b border-border/30 bg-primary/10">
          <CardTitle className="text-sm font-mono text-primary flex flex-col gap-3">
            <div className="flex items-center gap-2"><Cpu className="w-4 h-4" /> AI REASONING LOGS</div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-primary/50" />
              <input 
                type="text" 
                placeholder="Search traces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background border border-primary/20 rounded-md pl-8 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-y-auto flex-1 custom-scrollbar">
          {evidence.length === 0 ? (
            <div className="p-4 text-xs text-muted-foreground animate-pulse flex items-center justify-center h-20">Awaiting Agent Outputs...</div>
          ) : (
            <div className="divide-y divide-border/30">
              {evidence.filter(item => item.text?.toLowerCase().includes(searchQuery.toLowerCase()) || item.source_url?.toLowerCase().includes(searchQuery.toLowerCase())).map((item, i) => (
                <div 
                  key={i} 
                  className={`p-4 cursor-pointer transition-colors hover:bg-primary/10 ${selectedItem === item ? "bg-primary/20 border-l-2 border-primary" : ""}`}
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-primary flex items-center gap-1">
                      <TerminalSquare className="w-3 h-3" /> SWARM TRACE
                    </span>
                    <div className="flex items-center text-[10px] text-muted-foreground gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-xs text-foreground truncate font-medium flex items-center gap-1">
                    <Globe className="w-3 h-3" /> {item.source_url}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Viewer */}
      <Card className="flex-1 border-primary/30 bg-black/60 overflow-hidden flex flex-col shadow-[0_0_20px_rgba(6,182,212,0.15)]">
        <CardHeader className="pb-3 border-b border-primary/20 bg-primary/5">
          <CardTitle className="text-sm font-mono text-primary flex items-center gap-2">
            <TerminalSquare className="w-4 h-4" /> MULTI-AGENT THOUGHT PROCESS
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden flex-1 font-mono text-xs text-slate-300 flex flex-col">
          {selectedItem ? (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-4 bg-black/50 border-b border-border/50 text-[10px] text-muted-foreground h-32 shrink-0 overflow-y-auto custom-scrollbar">
                <span className="text-primary/70 block mb-1">=== TARGET RAW INTEL ===</span>
                {parseTraces(selectedItem.text).rawText}
              </div>
              <div className="p-6 flex-1 overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed text-green-400/90 font-medium">
                {parseTraces(selectedItem.text).traces}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-primary/40 flex-col gap-4">
              <Cpu className="w-16 h-16 animate-pulse" />
              <span className="text-sm tracking-widest uppercase">Select an investigation trace</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
