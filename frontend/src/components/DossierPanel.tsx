import React, { useState, useEffect } from "react";
import { X, ShieldAlert, AlertTriangle, Link as LinkIcon, Phone, Mail, Activity, User, MapPin, Database, Network, BrainCircuit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function DossierPanel({ node, edges, onClose, onTraceComplete }: { node: any, edges: any[], onClose: () => void, onTraceComplete?: () => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [explainData, setExplainData] = useState<any>(null);
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [tracing, setTracing] = useState(false);

  useEffect(() => {
    if (!node) return;
    const fetchProfile = async () => {
      setLoadingProfile(true);
      setProfile(null);
      try {
        const res = await fetch(`/api/v1/profile/${encodeURIComponent(node.id)}`);
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (e) {
        console.error("Failed to load profile", e);
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [node]);

  if (!node) return null;

  const nodeEdges = edges.filter(e => e.source === node.id || e.target === node.id);

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case "Narcotics": return "text-destructive border-destructive/50 bg-destructive/10";
      case "Terror Financing": return "text-destructive border-destructive/50 bg-destructive/10";
      case "Money Laundering": return "text-accent border-accent/50 bg-accent/10";
      case "Cybercrime": return "text-primary border-primary/50 bg-primary/10";
      default: return "text-muted-foreground border-border/50 bg-secondary/50";
    }
  };

  const isHighRisk = node.score && node.score > 50;

  return (
    <div className="fixed top-0 right-0 h-screen w-80 glass-panel border-l border-border/50 shadow-2xl flex flex-col z-[100] dossier-enter">
      <div className="p-4 border-b border-border/30 flex justify-between items-center bg-black/40">
        <h3 className="font-bold text-lg flex items-center gap-2">
          {isHighRisk && <ShieldAlert className="w-5 h-5 text-destructive" />}
          Intelligence Dossier
        </h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={async (e) => {
              const btn = e.currentTarget;
              btn.disabled = true;
              if (confirm("Are you sure you want to delete this case and all its connections?")) {
                try {
                  await fetch(`/api/v1/entity/${encodeURIComponent(node.id)}`, { method: "DELETE" });
                  if (onTraceComplete) onTraceComplete(); // Refresh graph
                  onClose();
                } catch (err) {
                  alert("Failed to delete entity");
                  btn.disabled = false;
                }
              } else {
                btn.disabled = false;
              }
            }}
            title="Delete Case"
            className="text-destructive/70 hover:text-destructive transition-colors p-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
        <div className="text-[6rem] font-black text-red-600/10 tracking-[0.2em] -rotate-45 select-none whitespace-nowrap">CLASSIFIED</div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto relative z-10">
        <div className="mb-6">
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Entity ID</label>
          <div className="font-mono text-sm break-all">{node.id}</div>
        </div>

        <div className="mb-6 flex justify-between items-center">
           <div>
             <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Category</label>
             <Badge variant="outline" className={`${getCategoryColor(node.category)}`}>
               {node.category || "Unknown"}
             </Badge>
           </div>
           <div>
             <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Sightings</label>
             <div className="font-mono text-sm">{node.sightings_count || 1}</div>
           </div>
           <div className="text-right flex flex-col items-end">
             <label className="text-xs text-white/50 uppercase tracking-widest mb-1 block font-bold">Threat Score</label>
             <div className="font-mono text-xl font-bold flex items-center gap-3">
               {node.score > 0 && !explainData && (
                 <button 
                   onClick={async () => {
                     setLoadingExplain(true);
                     try {
                       const res = await fetch(`/api/v1/explain/${encodeURIComponent(node.id)}`);
                       if (res.ok) setExplainData(await res.json());
                     } catch(e) { console.error(e); }
                     setLoadingExplain(false);
                   }}
                   className="text-[10px] text-cyan-400 uppercase tracking-widest border border-cyan-400/30 px-2 py-0.5 rounded hover:bg-cyan-400/10 transition-colors flex items-center gap-1"
                   disabled={loadingExplain}
                 >
                   {loadingExplain ? <Activity className="w-3 h-3 animate-spin" /> : <BrainCircuit className="w-3 h-3" />} Explain
                 </button>
               )}
               <span>
                 <span className={(node.score || 0) > 60 ? 'text-destructive' : (node.score || 0) > 30 ? 'text-amber-400' : 'text-green-400'}>{node.score || 0}</span><span className="text-muted-foreground text-sm">/100</span>
               </span>
             </div>
             <div className="w-full h-1.5 bg-black/50 mt-2 rounded-full overflow-hidden flex items-center shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
               <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, node.score || 0)}%`, background: (node.score || 0) > 60 ? '#ff5e67' : (node.score || 0) > 30 ? '#f1c15c' : '#63eba9', boxShadow: `0 0 10px ${(node.score || 0) > 60 ? '#ff5e67' : (node.score || 0) > 30 ? '#f1c15c' : '#63eba9'}` }}></div>
             </div>
             
             {/* Score Explanation Box */}
             {explainData && (
               <div className="w-full text-left mt-3 bg-black/40 border border-border/50 p-3 rounded text-xs animate-in fade-in slide-in-from-top-2">
                 <div className="text-white/80 italic mb-2 border-l-2 border-cyan-400/50 pl-2">
                   {explainData.key_factors?.map((f: string, i: number) => <div key={i}>• {f}</div>)}
                 </div>
                 <div className="grid grid-cols-3 gap-1 text-[9px] text-center uppercase tracking-widest text-muted-foreground mt-2 border-t border-border/30 pt-2">
                   <div>Fin. Exp<br/><span className="text-white font-mono">{explainData.breakdown?.financial_exposure || 0}/40</span></div>
                   <div>Op. Sec<br/><span className="text-white font-mono">{explainData.breakdown?.operational_security || 0}/30</span></div>
                   <div>Net. Cen<br/><span className="text-white font-mono">{explainData.breakdown?.network_centrality || 0}/30</span></div>
                 </div>
               </div>
             )}
           </div>
        </div>

        {node.desc && (
            <div className="mb-6 bg-secondary/30 p-3 rounded-md border border-border/50">
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                 <AlertTriangle className="w-3 h-3" /> AI Context Summary
              </label>
              <p className="text-sm leading-relaxed">{node.desc}</p>
            </div>
        )}

        {(node.real_name || node.phone || node.email || node.bank_account || node.address) && (
            <div className="mb-6">
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
                 <User className="w-3 h-3" /> Personally Identifiable Information
              </label>
              <ul className="space-y-2">
                {node.real_name && (
                  <li className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" /> <span className="font-medium text-foreground">{node.real_name}</span>
                  </li>
                )}
                {node.phone && (
                  <li className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-orange-400" /> <span className="font-medium text-foreground">{node.phone}</span>
                  </li>
                )}
                {node.email && (
                  <li className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-blue-400" /> <span className="font-medium text-foreground">{node.email}</span>
                  </li>
                )}
                {node.address && (
                  <li className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" /> <span className="font-medium text-foreground">{node.address}</span>
                  </li>
                )}
                {node.bank_account && (
                  <li className="flex items-center gap-2 text-sm">
                    <Activity className="w-4 h-4 text-green-400" /> <span className="font-medium text-foreground">Fiat Acct: {node.bank_account}</span>
                  </li>
                )}
              </ul>
            </div>
        )}

        {/* AI Persona Profile */}
        <div className="mb-6 bg-primary/5 p-4 rounded-lg border border-primary/20 shadow-inner relative overflow-hidden">
           <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
           <label className="text-xs text-primary font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <BrainCircuit className="w-4 h-4" /> AI Persona Profile
           </label>
           
           {loadingProfile ? (
             <div className="space-y-2">
               <Skeleton className="h-4 w-full bg-primary/10" />
               <Skeleton className="h-4 w-5/6 bg-primary/10" />
               <Skeleton className="h-8 w-full mt-2 bg-primary/10" />
             </div>
           ) : profile ? (
             <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                   <div className="bg-background/50 p-2 rounded border border-border/50">
                      <span className="text-[10px] text-muted-foreground uppercase block mb-1">OpSec Level</span>
                      <span className={`text-xs font-bold ${profile.opsec_level === 'Low' ? 'text-destructive' : profile.opsec_level === 'Moderate' ? 'text-accent' : 'text-primary'}`}>
                        {profile.opsec_level || "Unknown"}
                      </span>
                   </div>
                   <div className="bg-background/50 p-2 rounded border border-border/50">
                      <span className="text-[10px] text-muted-foreground uppercase block mb-1">Sophistication</span>
                      <span className={`text-xs font-bold ${profile.sophistication === 'High' ? 'text-destructive' : 'text-primary'}`}>
                        {profile.sophistication || "Unknown"}
                      </span>
                   </div>
                   <div className="bg-background/50 p-2 rounded border border-border/50 col-span-2">
                      <span className="text-[10px] text-muted-foreground uppercase block mb-1">Primary Motivation</span>
                      <span className="text-xs font-medium text-foreground">{profile.motivation || "Unknown"}</span>
                   </div>
                </div>
                <div className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2 py-1">
                   "{profile.summary}"
                </div>
             </div>
           ) : (
             <div className="text-xs text-muted-foreground italic">Profile unavailable.</div>
           )}
        </div>
        
        {/* Blockchain Intel */}

        {node.tx_count !== undefined && node.tx_count > 0 && (
            <div className="mb-6 bg-black/30 p-3 rounded-md border border-border/50">
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                 <Database className="w-3 h-3" /> Blockchain Intelligence
              </label>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">Tx Count</span>
                  <span className="font-mono">{node.tx_count}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Final Balance</span>
                  <span className="font-mono">{node.final_balance?.toFixed(4)} BTC</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block text-xs">Total Received</span>
                  <span className="font-mono">{node.total_received?.toFixed(4)} BTC</span>
                </div>
              </div>
            </div>
        )}

        {node.tx_count !== undefined && (
            <div className="mb-6 bg-primary/5 p-3 rounded-md border border-primary/20 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-cyan-400" />
              <label className="text-xs text-primary font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
                 <div className="flex items-center gap-1.5"><Network className="w-4 h-4" /> Trace Analysis</div>
                 <button 
                    onClick={async () => {
                       setTracing(true);
                       try {
                         await fetch(`/api/v1/trace/${node.id}?crypto_type=${node.crypto_type || 'BTC'}&hops=3`);
                         if (onTraceComplete) onTraceComplete();
                       } catch (e) {
                         console.error(e);
                       }
                       setTracing(false);
                    }}
                    disabled={tracing}
                    className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] px-2.5 py-1 rounded transition-colors uppercase font-bold flex items-center gap-1"
                 >
                   {tracing ? <Activity className="w-3 h-3 animate-spin" /> : "▶ Trace On-Chain"}
                 </button>
              </label>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Transaction Count</div>
                  <div className="font-mono text-sm mt-0.5">{node.tx_count}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Final Balance</div>
                  <div className="font-mono text-sm mt-0.5">{node.final_balance?.toFixed(4)}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Total Received</div>
                  <div className="font-mono text-sm text-green-400 font-bold mt-0.5">{node.total_received?.toFixed(4)}</div>
                </div>
              </div>
            </div>
        )}

        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
             <LinkIcon className="w-3 h-3" /> Known Relationships ({nodeEdges.length})
          </label>
          {nodeEdges.length === 0 ? (
             <p className="text-sm text-muted-foreground italic">No known connections.</p>
          ) : (
            <ul className="space-y-3">
              {nodeEdges.map((e, i) => {
                 const isSource = e.source === node.id || (e.source?.id && e.source.id === node.id);
                 const otherNodeId = isSource ? (e.target?.id || e.target) : (e.source?.id || e.source);
                 return (
                     <li key={i} className={`text-sm p-2 rounded border ${e.relation === 'TRANSACTED_WITH' ? 'bg-green-950/20 border-green-500/30' : 'bg-black/20 border-border/30'}`}>
                        <span className={`text-xs uppercase tracking-wider block mb-1 ${e.relation === 'TRANSACTED_WITH' ? 'text-green-400 font-bold' : 'text-muted-foreground'}`}>
                          {isSource ? "OUTGOING" : "INCOMING"} • {e.relation} {e.amount ? `(Value: ${e.amount})` : ''}
                        </span>
                        <span className="font-mono text-xs break-all text-primary/80">{otherNodeId}</span>
                     </li>
                 )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
