import React, { useState, useEffect } from "react";
import { X, ShieldAlert, AlertTriangle, Link as LinkIcon, Phone, Mail, Activity, User, MapPin, Database, Network, BrainCircuit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function DossierPanel({ node, edges, onClose }: { node: any, edges: any[], onClose: () => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

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
    <div className="absolute top-0 right-0 h-full w-80 bg-card border-l border-border/50 shadow-2xl flex flex-col z-20 animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-border/30 flex justify-between items-center bg-black/40">
        <h3 className="font-bold text-lg flex items-center gap-2">
          {isHighRisk && <ShieldAlert className="w-5 h-5 text-destructive" />}
          Intelligence Dossier
        </h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
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
           <div className="text-right">
             <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Threat Score</label>
             <div className={`text-xl font-bold ${isHighRisk ? 'text-destructive' : 'text-primary'}`}>
                {node.score || 0}/100
             </div>
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
            <div className="mb-6 bg-primary/10 p-3 rounded-md border border-primary/30">
              <label className="text-xs text-primary uppercase tracking-wider mb-2 flex items-center gap-1">
                 <Network className="w-3 h-3" /> Blockchain Forensics (Simulated API)
              </label>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">Transaction Count</div>
                  <div className="font-mono text-sm">{node.tx_count}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">Final Balance</div>
                  <div className="font-mono text-sm">{node.final_balance}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-[10px] text-muted-foreground uppercase">Total Received</div>
                  <div className="font-mono text-sm text-green-400">{node.total_received}</div>
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
