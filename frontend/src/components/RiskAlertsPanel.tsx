import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Globe, Clock, FileText, AlertTriangle } from "lucide-react";

export function RiskAlertsPanel() {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const fetchEvidence = async () => {
      try {
        const res = await fetch("/api/v1/export/json");
        if (res.ok) {
          const data = await res.json();
          const allNodes = data.nodes || [];
          
          const highRisk = allNodes
            .filter((n: any) => (n.properties?.score || 0) >= 50 || n.properties?.category === "Narcotics" || n.properties?.category === "Terror Financing")
            .map((n: any) => n.properties);
            
          setAlerts(highRisk);
        }
      } catch (e) {
        console.error("Failed to fetch evidence");
      }
    };
    fetchEvidence();
    const timer = setInterval(fetchEvidence, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-full flex-col gap-4">
      <Card className="border-red-500/30 bg-red-950/10 flex-1 overflow-hidden flex flex-col">
        <CardHeader className="pb-3 border-b border-red-500/20 bg-red-900/20">
          <CardTitle className="text-sm font-mono text-red-500 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 animate-pulse" /> HIGH PRIORITY THREAT ALERTS
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {alerts.length === 0 ? (
            <div className="h-full flex items-center justify-center flex-col gap-4 opacity-50">
              <ShieldAlert className="w-16 h-16 text-muted-foreground" />
              <span className="text-muted-foreground uppercase tracking-widest text-sm">No Active High-Risk Threats Detected</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {alerts.map((alert, i) => (
                <div key={i} className="bg-black/50 border border-red-500/30 p-4 rounded-lg flex flex-col gap-3 relative overflow-hidden group hover:border-red-500/50 transition-colors">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                  <div className="flex justify-between items-center pl-3">
                    <Badge className="bg-red-500 hover:bg-red-600 text-white font-mono flex items-center gap-1 text-xs px-2 py-0.5 shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                      <AlertTriangle className="w-3 h-3" /> THREAT SCORE: {alert.score || 0}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" /> {alert.last_seen ? new Date(alert.last_seen).toLocaleString() : (alert.timestamp ? new Date(alert.timestamp).toLocaleString() : "Unknown")}
                    </span>
                  </div>
                  <div className="pl-3 flex flex-col gap-2">
                    <div className="text-sm font-medium text-red-200 flex items-center gap-2 font-mono">
                      {alert.type === "Wallet" ? "WALLET:" : "SUSPECT:"} {alert.id}
                    </div>
                    <div className="text-xs font-medium text-red-300/80 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-red-400" /> {alert.source_url}
                    </div>
                    <div className="bg-red-950/30 p-3 rounded text-xs font-mono text-red-100 border border-red-500/20 whitespace-pre-wrap leading-relaxed shadow-inner">
                      {alert.desc || "No context available."}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
