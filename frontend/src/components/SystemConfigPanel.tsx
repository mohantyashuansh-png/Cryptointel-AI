import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings, Database, Server, Key, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SystemConfigPanel() {
  const [dbStatus, setDbStatus] = useState({ neo4j: "Checking...", lancedb: "Checking..." });
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);
  
  const [targets, setTargets] = useState<any[]>([]);
  const [newTargetUrl, setNewTargetUrl] = useState("");
  const [newTargetType, setNewTargetType] = useState("Surface Web");

  const fetchTargets = async () => {
    try {
      const res = await fetch("/api/v1/scraper/targets");
      if (res.ok) setTargets(await res.json());
    } catch (e) {
      console.error("Failed to fetch targets");
    }
  };

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch("/api/v1/health");
        if (res.ok) {
          const data = await res.json();
          setDbStatus(data);
        }
      } catch (e) {
        setDbStatus({ neo4j: "Error", lancedb: "Error" });
      }
    };
    fetchHealth();
    fetchTargets();
    const timer = setInterval(fetchHealth, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleAddTarget = async () => {
    if (!newTargetUrl) return;
    try {
      await fetch("/api/v1/scraper/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newTargetUrl, type: newTargetType })
      });
      setNewTargetUrl("");
      fetchTargets();
    } catch (e) {
      console.error("Failed to add target");
    }
  };

  const handleDeleteTarget = async (url: string) => {
    try {
      await fetch(`/api/v1/scraper/targets?url=${encodeURIComponent(url)}`, { method: "DELETE" });
      fetchTargets();
    } catch (e) {
      console.error("Failed to delete target");
    }
  };

  const handleFlushData = async () => {
    setClearing(true);
    try {
      await fetch("/api/v1/flush", { method: "DELETE" });
      setCleared(true);
      setTimeout(() => setCleared(false), 3000);
    } catch (e) {
      console.error("Failed to flush data");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="w-full h-full max-w-5xl mx-auto flex flex-col gap-6 pt-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-2 flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" /> System Configuration
          </h2>
          <p className="text-muted-foreground text-sm">
            Manage backend connections, API keys, UI settings, and autonomous scraper targets.
          </p>
        </div>
        <div>
          <ThemeToggle />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Connection Status */}
        <Card className="border-border/50 bg-card/40">
          <CardHeader className="border-b border-border/30 bg-black/20 pb-3">
            <CardTitle className="text-sm flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
              <Database className="w-4 h-4" /> Database Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Neo4j Graph Database</span>
              <Badge variant="outline" className={dbStatus.neo4j === "Connected" ? "bg-green-500/10 text-green-400 border-green-500/50" : "bg-red-500/10 text-red-400 border-red-500/50"}>
                {dbStatus.neo4j}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">LanceDB Vector Vault</span>
              <Badge variant="outline" className={dbStatus.lancedb === "Connected" ? "bg-green-500/10 text-green-400 border-green-500/50" : "bg-red-500/10 text-red-400 border-red-500/50"}>
                {dbStatus.lancedb}
              </Badge>
            </div>
            <div className="pt-4 border-t border-border/50">
              <button 
                onClick={handleFlushData}
                disabled={clearing}
                className="flex items-center gap-2 px-4 py-2 w-full justify-center bg-destructive/10 text-destructive font-medium text-sm rounded-md border border-destructive/30 hover:bg-destructive/20 transition-colors"
              >
                {clearing ? <Trash2 className="w-4 h-4 animate-spin" /> : (cleared ? <CheckCircle2 className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />)}
                {clearing ? "Flushing Data..." : (cleared ? "Data Flushed!" : "Flush All Graph & Vector Data")}
              </button>
              <p className="text-xs text-muted-foreground mt-2 text-center">Warning: This will clear all intelligence.</p>
            </div>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card className="border-border/50 bg-card/40">
          <CardHeader className="border-b border-border/30 bg-black/20 pb-3">
            <CardTitle className="text-sm flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
              <Key className="w-4 h-4" /> LLM Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Primary Swarm Engine</span>
              <span className="text-xs font-mono bg-black/30 px-2 py-1 rounded">Gemini-3.1-Flash-Lite</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Gemini API Key</span>
              <span className="text-xs font-mono text-muted-foreground">********************</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Groq Fallback API Key</span>
              <span className="text-xs font-mono text-muted-foreground">********************</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">CrewAI Logging</span>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/50">
                Verbose
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Scraper Targets */}
        <Card className="border-border/50 bg-card/40 md:col-span-2">
          <CardHeader className="border-b border-border/30 bg-black/20 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
              <Server className="w-4 h-4" /> Autonomous Scraper Targets
            </CardTitle>
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/50 animate-pulse">
              Scraper Active
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-black/40 text-muted-foreground text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Source URL</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {targets.map((target, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{target.url}</td>
                    <td className="px-4 py-3">{target.type}</td>
                    <td className="px-4 py-3 flex gap-2 items-center">
                      <Badge variant="outline" className="text-green-400 border-green-500/50">Active</Badge>
                      <button onClick={() => handleDeleteTarget(target.url)} className="text-red-400 hover:text-red-300 ml-2">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 flex gap-2 bg-black/20">
              <input
                type="text"
                placeholder="Target URL..."
                value={newTargetUrl}
                onChange={(e) => setNewTargetUrl(e.target.value)}
                className="flex-1 bg-background border border-border/50 rounded-md px-3 py-1.5 text-sm"
              />
              <select
                value={newTargetType}
                onChange={(e) => setNewTargetType(e.target.value)}
                className="bg-background border border-border/50 rounded-md px-3 py-1.5 text-sm"
              >
                <option value="Surface Web">Surface Web</option>
                <option value="Telegram">Telegram</option>
                <option value="Deep Web (.onion)">Deep Web (.onion)</option>
              </select>
              <button onClick={handleAddTarget} className="bg-primary/20 text-primary border border-primary/50 hover:bg-primary/30 px-4 py-1.5 rounded-md text-sm transition-colors">
                Add Target
              </button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
