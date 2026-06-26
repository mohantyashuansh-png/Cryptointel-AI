"use client";

import { useEffect, useState, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, ShieldAlert, Cpu, Network, Download, Calendar, Filter, Radio, TerminalSquare, CheckCircle2, Search, ExternalLink, Mail, Phone, Link2, FileText, Minimize2, Maximize2, Expand, Shrink, AlertTriangle, X, Play, Pause, Clock, List } from "lucide-react";
import dynamic from "next/dynamic";
import { DossierPanel } from "@/components/DossierPanel";
import { LiveScraperPanel } from "@/components/LiveScraperPanel";
import { RiskAlertsPanel } from "@/components/RiskAlertsPanel";
import { AgentTracesPanel } from "@/components/AgentTracesPanel";
import { ManualIntelDropPanel } from "@/components/ManualIntelDropPanel";
import { SystemConfigPanel } from "@/components/SystemConfigPanel";
import AskAIPanel from "@/components/AskAIPanel";

const NetworkGraph = dynamic(() => import("@/components/NetworkGraph"), { ssr: false });

function AgentMonitor({ isMinimized, setIsMinimized }: { isMinimized: boolean, setIsMinimized: (val: boolean) => void }) {
  const [logs, setLogs] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch("/api/v1/logs");
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs || []);
        }
      } catch (e) {
        // Silently ignore network errors if backend is down
      }
    };
    
    // Poll every 1 second
    fetchLogs();
    const timer = setInterval(fetchLogs, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll to bottom whenever new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <Card className={`border-border/50 bg-black/80 flex flex-col transition-all duration-300 ${isMinimized ? 'h-[60px]' : 'h-[500px]'} overflow-hidden`}>
      <CardHeader className="pb-3 border-b border-border/30 bg-black/90 flex flex-row items-center justify-between cursor-pointer hover:bg-black/70" onClick={() => setIsMinimized(!isMinimized)}>
        <CardTitle className="text-sm font-mono text-primary flex items-center gap-2">
           <TerminalSquare className="w-4 h-4 animate-pulse" /> LIVE SWARM TERMINAL
        </CardTitle>
        <button className="text-muted-foreground hover:text-foreground">
          {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
        </button>
      </CardHeader>
      {!isMinimized && (
        <CardContent className="p-4 font-mono text-[10px] sm:text-xs flex flex-col gap-1 overflow-y-auto h-[440px]" ref={scrollRef}>
          {logs.length === 0 ? (
            <div className="text-muted-foreground animate-pulse mt-2 ml-2">Awaiting intelligence payload...</div>
          ) : (
          logs.map((log, i) => {
            // Apply some basic color coding based on standard CrewAI output
            let textColor = "text-slate-300";
            if (log.includes("[ERROR]") || log.includes("Error")) textColor = "text-red-500";
            else if (log.includes("Agent Started")) textColor = "text-blue-400 mt-3 font-bold";
            else if (log.includes("Agent Finished") || log.includes("I know the final answer") || log.includes("Final Answer:")) textColor = "text-green-400 mb-2 font-bold";
            else if (log.includes("Thought:")) textColor = "text-purple-400";
            else if (log.includes("Action:")) textColor = "text-yellow-400";
            
            return (
              <div key={i} className={`whitespace-pre-wrap ${textColor}`}>
                {log}
              </div>
            );
          })
        )}
      </CardContent>
      )}
    </Card>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("Intelligence Graph");
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [isGraphMinimized, setIsGraphMinimized] = useState(false);
  const [isTerminalMinimized, setIsTerminalMinimized] = useState(false);
  const [isGraphFullscreen, setIsGraphFullscreen] = useState(false);
  const [activeToasts, setActiveToasts] = useState<any[]>([]);
  const seenIds = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);
  
  // Timeline Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState<number | null>(null);
  const [minTime, setMinTime] = useState<number>(0);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showKpiStats, setShowKpiStats] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [maxTime, setMaxTime] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isSliderMinimized, setIsSliderMinimized] = useState(false);
  
  // Filters
  const [daysFilter, setDaysFilter] = useState(7);
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [searchQuery, setSearchQuery] = useState("");
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/v1/export/json");
        if (res.ok) {
          const data = await res.json();
          const allNodes = data.nodes || [];
          setNodes(allNodes);
          setEdges(data.edges || []);
          
          // Calculate Timeline bounds
          if (allNodes.length > 0) {
             let currentMin = Infinity;
             let currentMax = 0;
             allNodes.forEach((n: any) => {
                const ts = n.properties?.last_seen || n.properties?.timestamp;
                if (ts) {
                   const t = new Date(ts).getTime();
                   if (t < currentMin) currentMin = t;
                   if (t > currentMax) currentMax = t;
                }
             });
             if (currentMin !== Infinity && currentMax !== 0) {
                setMinTime(currentMin);
                setMaxTime(currentMax);
                // Initialize playback time if not set
                if (playbackTime === null) {
                   setPlaybackTime(currentMax);
                }
             }
          }
          
          // Global High Risk Alert Logic
          const highRisk = allNodes
            .filter((n: any) => (n.properties?.score || 0) >= 70 || n.properties?.category === "Terror Financing")
            .map((n: any) => n.properties);
            
          if (initialLoadDone.current) {
            const newAlerts = highRisk.filter((a: any) => !seenIds.current.has(a.id));
            if (newAlerts.length > 0) {
              newAlerts.forEach((a: any) => {
                const toastId = Math.random().toString(36).substring(7);
                setActiveToasts(prev => [...prev, { ...a, toastId }]);
                setTimeout(() => {
                  setActiveToasts(prev => prev.filter(t => t.toastId !== toastId));
                }, 8000);
              });
            }
          }
          
          highRisk.forEach((a: any) => seenIds.current.add(a.id));
          initialLoadDone.current = true;
        }
      } catch (err) {
        console.error("Failed to fetch graph data", err);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 5000); // Live poll every 5s
    return () => clearInterval(interval);
  }, []);

  // Playback loop
  useEffect(() => {
    let interval: any;
    if (isPlaying && maxTime > minTime) {
      interval = setInterval(() => {
        setPlaybackTime((prev) => {
          if (!prev || prev >= maxTime) {
            setIsPlaying(false);
            return maxTime;
          }
          // Advance by 1% per tick multiplied by speed
          const step = Math.max((maxTime - minTime) / 200, 1000 * 60 * 60) * playbackSpeed;
          return Math.min(prev + step, maxTime);
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, maxTime, minTime, playbackSpeed]);

  // Compute Ticker data
  const [timeSinceLastExt, setTimeSinceLastExt] = useState<string>("Waiting...");
  useEffect(() => {
    const updateTicker = () => {
      if (nodes.length === 0) return;
      // find the latest timestamp
      let latest = 0;
      nodes.forEach(n => {
        if (n.properties?.timestamp) {
          const d = new Date(n.properties.timestamp).getTime();
          if (d > latest) latest = d;
        }
      });
      if (latest > 0) {
        const seconds = Math.floor((Date.now() - latest) / 1000);
        if (seconds < 60) setTimeSinceLastExt(`${seconds} seconds ago`);
        else setTimeSinceLastExt(`${Math.floor(seconds / 60)} minutes ago`);
      }
    };
    updateTicker();
    const tickerInterval = setInterval(updateTicker, 1000);
    return () => clearInterval(tickerInterval);
  }, [nodes]);

  // Filter nodes
  const filteredNodes = nodes.filter(node => {
    // 1. Timeline filter
    const dateStr = node.properties?.last_seen || node.properties?.timestamp;
    if (dateStr) {
      const nodeDate = new Date(dateStr);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysFilter);
      if (nodeDate < cutoffDate) return false;
      
      // Playback filter
      if (playbackTime !== null && nodeDate.getTime() > playbackTime) {
        return false;
      }
    }
    
    // 2. Category filter
    if (selectedCategory !== "All Categories") {
      const cat = node.properties?.category || "Unknown";
      if (cat !== selectedCategory) return false;
    }

    // 3. Search Filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      const idMatch = node.properties?.id?.toLowerCase().includes(query);
      const descMatch = node.properties?.desc?.toLowerCase().includes(query);
      const typeMatch = node.properties?.crypto_type?.toLowerCase().includes(query) || (node.labels && node.labels[0]?.toLowerCase().includes(query)) || node.properties?.type?.toLowerCase().includes(query);
      if (!idMatch && !descMatch && !typeMatch) return false;
    }

    return true;
  });

  // Also filter edges where both source and target are in filteredNodes
  const filteredNodeIds = new Set(filteredNodes.map(n => n.properties?.id));
  const filteredEdges = edges.filter(e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/30">
      {/* GLOBAL TOAST CONTAINER */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-3 pointer-events-none">
        {activeToasts.map(toast => (
          <div key={toast.toastId} className="pointer-events-auto w-[450px] bg-red-950/90 border-2 border-red-500 rounded-lg shadow-[0_0_30px_rgba(239,68,68,0.6)] p-4 animate-in slide-in-from-top-10 fade-in duration-500 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-[pulse_1s_ease-in-out_infinite]" />
             <button onClick={() => setActiveToasts(prev => prev.filter(t => t.toastId !== toast.toastId))} className="absolute top-2 right-2 text-red-300 hover:text-white">
               <X className="w-4 h-4" />
             </button>
             <div className="flex items-start gap-3">
                <AlertTriangle className="w-8 h-8 text-red-500 animate-pulse mt-1 shrink-0" />
                <div>
                   <h4 className="font-bold font-mono text-red-100 text-lg uppercase tracking-wider mb-1">High-Risk Entity Detected</h4>
                   <p className="text-sm font-mono text-red-300 mb-2">Score: {toast.score} | Category: {toast.category || "Unknown"}</p>
                   <p className="text-xs text-red-200/70 font-mono truncate max-w-[350px]">ID: {toast.id}</p>
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 overflow-y-auto p-8 relative flex flex-col">
        {activeTab === "Intelligence Graph" ? (
          <>
            {selectedNode && (
               <DossierPanel 
                 node={selectedNode.properties || selectedNode} 
                 edges={filteredEdges} 
                 onClose={() => setSelectedNode(null)} 
               />
            )}
            <header className="mb-6 flex flex-col xl:flex-row xl:items-start justify-between gap-4 border-b border-border/50 pb-4">
              <div className="flex flex-col gap-3 flex-1 w-full max-w-2xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Global Search (Wallet, Name, Phone, Email...)" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-background border border-border/50 rounded-md pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                  />
                </div>
                <div className="flex items-center text-xs text-muted-foreground gap-2">
                  <Radio className="w-3 h-3 text-green-400 animate-pulse shrink-0" />
                  <span className="font-mono bg-black/30 px-2 py-0.5 rounded border border-border/50 truncate">
                    Live Ticker // Last extraction: {timeSinceLastExt} - Target: Pastebin Asset Drop
                  </span>
                </div>
              </div>
              <div className="flex gap-3 flex-wrap justify-end relative">
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  onBlur={() => setTimeout(() => setShowExportMenu(false), 200)}
                  className="flex items-center gap-2 px-4 py-2 font-medium text-xs rounded-md border border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                >
                  <Download className="w-4 h-4" /> Export Actions
                </button>
                {showExportMenu && (
                  <div className="absolute top-full mt-2 right-0 w-56 rounded-md border border-border/50 bg-black/90 backdrop-blur-md shadow-2xl z-[100] flex flex-col p-1 animate-in fade-in zoom-in-95">
                    <a href={`/api/v1/export/csv?days=${daysFilter}&category=${encodeURIComponent(selectedCategory)}&search=${encodeURIComponent(searchQuery)}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 text-xs font-mono hover:bg-white/10 rounded-sm transition-colors text-primary">
                      <Download className="w-3 h-3" /> Export Data (CSV)
                    </a>
                    <a href="/api/v1/export/report" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 text-xs font-mono hover:bg-white/10 rounded-sm transition-colors text-accent">
                      <FileText className="w-3 h-3" /> Full Report (HTML)
                    </a>
                    <button onClick={() => window.open("/api/v1/export/pdf", "_blank")} className="flex items-center gap-2 px-3 py-2 text-xs font-mono hover:bg-white/10 rounded-sm transition-colors text-left text-destructive">
                      <FileText className="w-3 h-3" /> Export PDF Report
                    </button>
                    <button onClick={() => window.open("/api/v1/export/report", "_blank")} className="flex items-center gap-2 px-3 py-2 text-xs font-mono hover:bg-white/10 rounded-sm transition-colors text-left text-purple-400">
                      <Activity className="w-3 h-3" /> Generate Threat Bulletin
                    </button>
                  </div>
                )}
              </div>
            </header>

            {/* KPI Stats Row Toggle */}
            <div className="mb-4 flex items-center justify-between">
               <button onClick={() => setShowKpiStats(!showKpiStats)} className="text-xs font-mono font-medium text-muted-foreground hover:text-foreground flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/30 hover:bg-secondary/60 transition-colors border border-border/50">
                 {showKpiStats ? <Shrink className="w-3.5 h-3.5" /> : <Expand className="w-3.5 h-3.5" />}
                 {showKpiStats ? "HIDE KPI DASHBOARD" : "SHOW KPI DASHBOARD"}
               </button>
            </div>

            {showKpiStats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
              <Card className="bg-card/40 border-border/50">
                <CardContent className="p-4 flex flex-col justify-center">
                  <div className="text-muted-foreground text-xs font-bold tracking-widest uppercase mb-1">Total Entities</div>
                  <div className="text-2xl font-bold">{filteredNodes.length}</div>
                </CardContent>
              </Card>
              <Card className="bg-card/40 border-border/50">
                <CardContent className="p-4 flex flex-col justify-center">
                  <div className="text-muted-foreground text-xs font-bold tracking-widest uppercase mb-1">High Risk Alerts</div>
                  <div className="text-2xl font-bold text-destructive animate-pulse flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5" />
                    {filteredNodes.filter(n => (n.properties?.score || 0) > 50).length}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/40 border-border/50">
                <CardContent className="p-4 flex flex-col justify-center">
                  <div className="text-muted-foreground text-xs font-bold tracking-widest uppercase mb-1">Unique Suspects</div>
                  <div className="text-2xl font-bold text-primary">
                    {filteredNodes.filter(n => n.properties?.type === "Suspect").length}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/40 border-border/50">
                <CardContent className="p-4 flex flex-col justify-center">
                  <div className="text-muted-foreground text-xs font-bold tracking-widest uppercase mb-1">Crypto Addresses</div>
                  <div className="text-2xl font-bold text-green-400">
                    {filteredNodes.filter(n => n.properties?.type === "Wallet").length}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/40 border-border/50">
                <CardContent className="p-4 flex flex-col justify-center">
                  <div className="text-muted-foreground text-xs font-bold tracking-widest uppercase mb-1">Connected Graph Edges</div>
                  <div className="text-2xl font-bold text-accent">{filteredEdges.length}</div>
                </CardContent>
              </Card>
              
              {/* Timeline Heatmap */}
              <Card className="bg-card/40 border-border/50">
                <CardContent className="p-4 flex flex-col justify-center h-full">
                  <div className="text-muted-foreground text-xs font-bold tracking-widest uppercase mb-2">Activity Heatmap (7 Days)</div>
                  <div className="flex items-center gap-1 h-8">
                    {[6, 5, 4, 3, 2, 1, 0].map(dayOffset => {
                       const targetDate = new Date();
                       targetDate.setDate(targetDate.getDate() - dayOffset);
                       const dateString = targetDate.toISOString().split('T')[0];
                       
                       const count = filteredNodes.filter(n => {
                          const ts = n.properties?.last_seen || n.properties?.timestamp;
                          if (!ts) return false;
                          return ts.startsWith(dateString);
                       }).length;
                       
                       let intensity = "bg-secondary";
                       if (count > 0 && count < 3) intensity = "bg-primary/40";
                       else if (count >= 3 && count < 10) intensity = "bg-primary/70";
                       else if (count >= 10) intensity = "bg-primary";
                       
                       return (
                         <div key={dayOffset} className={`flex-1 h-full rounded-sm ${intensity} transition-all hover:ring-1 hover:ring-primary`} title={`${dateString}: ${count} entities`} />
                       );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
            )}

            {/* Filter Bar */}
            <div className="mb-6 bg-card/40 border border-border/50 rounded-lg p-4 flex flex-col md:flex-row items-center gap-6">

                <div className="flex-1 w-full flex items-center gap-4">
                  <Calendar className="text-muted-foreground w-5 h-5 shrink-0" />
                  <div className="flex-1">
                      <label className="text-sm font-medium mb-2 block">Timeline: Last {daysFilter} Days</label>
                      <input 
                          type="range" 
                          min="1" max="30" 
                          value={daysFilter} 
                          onChange={(e) => setDaysFilter(parseInt(e.target.value))}
                          className="w-full accent-primary cursor-pointer"
                      />
                  </div>
                </div>
                
                <div className="h-10 w-px bg-border hidden md:block"></div>
                
                <div className="flex-1 w-full flex items-center gap-4">
                  <Filter className="text-muted-foreground w-5 h-5 shrink-0" />
                  <div className="flex-1">
                      <label className="text-sm font-medium mb-2 block">Threat Category</label>
                      <select 
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full bg-background border border-border/50 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option>All Categories</option>
                        <option>Narcotics</option>
                        <option>Terror Financing</option>
                        <option>Money Laundering</option>
                        <option>Cybercrime</option>
                        <option>Unknown</option>
                      </select>
                  </div>
                </div>

                <div className="h-10 w-px bg-border hidden xl:block"></div>
                
                <div className="flex flex-col gap-2 shrink-0 w-full xl:w-auto">
                  <button onClick={() => { setSearchQuery(""); setDaysFilter(30); setSelectedCategory("All Categories"); }} className="px-4 py-1.5 w-full bg-secondary/50 hover:bg-secondary text-xs font-medium rounded-md border border-border transition-colors">
                    Clear Filters
                  </button>
                  <button onClick={() => setRecenterTrigger(prev => prev + 1)} className="px-4 py-1.5 w-full bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium rounded-md border border-primary/30 transition-colors">
                    Recenter Graph
                  </button>
                </div>
            </div>

            {/* Main Graph & Agent Monitor Split */}
            <div className={`flex flex-col lg:flex-row gap-6 mb-6 ${isTerminalMinimized ? 'items-start' : ''}`}>
               <div className={`transition-all duration-300 ${isTerminalMinimized ? 'lg:w-[300px]' : 'lg:w-1/3'} flex-shrink-0`}>
                  <AgentMonitor isMinimized={isTerminalMinimized} setIsMinimized={setIsTerminalMinimized} />
               </div>
               <Card className={`border-border/50 flex flex-col overflow-hidden transition-all duration-300 ${isGraphFullscreen ? 'fixed inset-4 z-50 bg-black shadow-2xl rounded-xl h-[calc(100vh-2rem)] border-primary/50' : (isGraphMinimized ? 'bg-card/40 flex-1 h-[60px]' : 'bg-card/40 flex-1 h-[500px]')}`}>
                 <CardHeader className="pb-3 border-b border-border/30 bg-black/20 flex flex-row items-center justify-between cursor-pointer hover:bg-black/30" onClick={(e) => {
                   if ((e.target as HTMLElement).closest('.controls-btn')) return;
                   if (!isGraphFullscreen) setIsGraphMinimized(!isGraphMinimized);
                 }}>
                   <CardTitle className="flex justify-between items-center text-lg w-full">
                     <span className="flex items-center gap-2"><Network className="w-5 h-5 text-primary" /> INTERACTIVE NETWORK MAP</span>
                     <div className="flex items-center gap-4">
                       <Badge variant="outline" className="font-mono text-xs text-muted-foreground bg-background/50 hidden sm:flex">
                         Neo4j Engine // Click Node for Dossier
                       </Badge>
                       <div className="flex items-center gap-2 controls-btn">
                         <button onClick={(e) => { e.stopPropagation(); setIsGraphFullscreen(!isGraphFullscreen); if(isGraphMinimized) setIsGraphMinimized(false); }} className="text-muted-foreground hover:text-foreground bg-black/50 p-1.5 rounded-md hover:bg-black/80 transition-colors">
                           {isGraphFullscreen ? <Shrink className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
                         </button>
                         {!isGraphFullscreen && (
                           <button onClick={(e) => { e.stopPropagation(); setIsGraphMinimized(!isGraphMinimized); }} className="text-muted-foreground hover:text-foreground bg-black/50 p-1.5 rounded-md hover:bg-black/80 transition-colors">
                             {isGraphMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                           </button>
                         )}
                       </div>
                     </div>
                   </CardTitle>
                 </CardHeader>
                 {!isGraphMinimized && (
                   <CardContent className={`p-0 ${isGraphFullscreen ? 'flex-1 h-full' : 'h-[440px]'}`}>
                     <div className="w-full h-full bg-black/40 overflow-hidden border border-border/50 relative">
                       <NetworkGraph nodes={filteredNodes} edges={filteredEdges} onNodeClick={(node) => setSelectedNode(node)} recenterTrigger={recenterTrigger} />
                       
                       {/* TIME MACHINE SLIDER */}
                       <div className={`absolute left-1/2 -translate-x-1/2 w-[80%] max-w-[800px] bg-black/80 backdrop-blur-md border border-primary/30 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.1)] z-10 flex flex-col pointer-events-auto transition-all duration-300 ${isSliderMinimized ? 'bottom-2 p-2' : 'bottom-6 p-4 gap-2'}`}>
                          <div className="flex items-center justify-between text-xs font-mono text-primary/80 mb-1">
                             <div className="flex items-center gap-1.5">
                               <Clock className="w-3.5 h-3.5" /> 
                               {!isSliderMinimized && "TEMPORAL PLAYBACK EVOLUTION"}
                             </div>
                             <div className="flex items-center gap-2">
                               {!isSliderMinimized && (
                                 <span className="text-white bg-primary/20 px-2 py-0.5 rounded border border-primary/50">
                                   {playbackTime ? new Date(playbackTime).toLocaleString() : "Live Focus"}
                                 </span>
                               )}
                               <button onClick={(e) => { e.stopPropagation(); setIsSliderMinimized(!isSliderMinimized); }} className="text-muted-foreground hover:text-white transition-colors">
                                  {isSliderMinimized ? <Expand className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                               </button>
                             </div>
                          </div>
                          {!isSliderMinimized && (
                            <div className="flex items-center gap-4">
                               <button 
                                 onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); if (playbackTime && playbackTime >= maxTime) setPlaybackTime(minTime); }}
                                 className="bg-primary/20 hover:bg-primary/40 text-primary p-2 rounded-full border border-primary/50 transition-colors"
                               >
                                 {isPlaying ? <Pause className="w-5 h-5 fill-primary" /> : <Play className="w-5 h-5 fill-primary" />}
                               </button>
                               <input 
                                 type="range" 
                                 min={minTime} 
                                 max={maxTime} 
                                 value={playbackTime || maxTime} 
                                 onChange={(e) => { e.stopPropagation(); setPlaybackTime(Number(e.target.value)); setIsPlaying(false); }}
                                 className="flex-1 accent-primary h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                               />
                               <select 
                                 value={playbackSpeed}
                                 onChange={(e) => { e.stopPropagation(); setPlaybackSpeed(Number(e.target.value)); }}
                                 className="bg-black/50 border border-primary/30 rounded text-[10px] uppercase font-bold text-muted-foreground hover:text-white px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
                               >
                                 <option value={0.25}>0.25x</option>
                                 <option value={0.5}>0.5x</option>
                                 <option value={1}>1.0x</option>
                                 <option value={2}>2.0x</option>
                                 <option value={5}>5.0x</option>
                               </select>
                               <button onClick={() => setPlaybackTime(maxTime)} className="text-[10px] uppercase font-bold text-muted-foreground hover:text-white px-2 py-1 bg-white/5 rounded border border-white/10 transition-colors">
                                 Live
                               </button>
                            </div>
                          )}
                       </div>
                     </div>
                   </CardContent>
                 )}
               </Card>
            </div>

            {/* Unified Minimizable Legend */}
            <div className="mb-6">
              {!showLegend ? (
                <button 
                  onClick={() => setShowLegend(true)} 
                  className="bg-black/60 border border-border/50 px-4 py-2 rounded-md backdrop-blur-sm hover:text-primary transition-colors text-muted-foreground cursor-pointer shadow-lg flex items-center gap-2 text-xs font-mono font-bold"
                >
                  <List className="w-4 h-4" /> SHOW SYSTEM LEGENDS
                </button>
              ) : (
                <div className="bg-black/30 border border-border/50 rounded-lg p-4 text-xs font-mono text-muted-foreground relative shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <button 
                    onClick={() => setShowLegend(false)}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-1 bg-black/50 rounded"
                    title="Minimize Legend"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </button>

                  <div className="flex flex-col xl:flex-row gap-6">
                    {/* Graph Colors */}
                    <div className="flex-1">
                      <div className="font-bold uppercase tracking-widest mb-3 border-b border-border/50 pb-1">Graph Threat Categories</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ef4444] shadow-[0_0_8px_#ef4444]" /> Narcotics / Terror</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#06b6d4] shadow-[0_0_8px_#06b6d4]" /> Money Laundering</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]" /> Cybercrime</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#64748b] shadow-[0_0_8px_#64748b]" /> Uncategorized</div>
                      </div>
                    </div>
                    
                    {/* Graph Shapes */}
                    <div className="shrink-0 xl:border-l xl:border-border/50 xl:pl-6">
                      <div className="font-bold uppercase tracking-widest mb-3 border-b border-border/50 pb-1">Entity Types</div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full border border-white" /> Crypto Wallet</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rotate-45 border border-white" /> Suspect Entity</div>
                      </div>
                    </div>
                  </div>

                  {/* Pipeline Timeline */}
                  <div className="mt-4 pt-3 border-t border-border/50">
                    <div className="font-bold uppercase tracking-widest mb-3">Agent Swarm Pipeline</div>
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 lg:justify-between w-full">
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div>RAW SOURCE SCRAPED</div>
                      <div className="text-border hidden md:block">→</div>
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500"></div>OSINT EXTRACTION</div>
                      <div className="text-border hidden md:block">→</div>
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div>RISK SCORED</div>
                      <div className="text-border hidden md:block">→</div>
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-destructive"></div>FLAGGED</div>
                      <div className="text-border hidden md:block">→</div>
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div>STORED IN NEO4J</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Live Intelligence Feed Table */}
            <Card className="border-border/50 bg-card/40 flex flex-col min-h-[400px]">
              <CardHeader className="pb-3 border-b border-border/30 bg-black/20">
                <CardTitle className="text-lg flex items-center gap-2">LIVE INTELLIGENCE FEED & WALLET REGISTRY</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader className="bg-black/40 sticky top-0 z-10">
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="py-3 px-4">Wallet / Entity</TableHead>
                      <TableHead className="py-3 px-4">Crypto Type</TableHead>
                      <TableHead className="py-3 px-4">PII Linked</TableHead>
                      <TableHead className="py-3 px-4">Source</TableHead>
                      <TableHead className="py-3 px-4">Last Seen</TableHead>
                      <TableHead className="py-3 px-4 text-right">Category & Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNodes.map((row, i) => {
                      // Check for PII
                      const desc = (row.properties?.desc || "").toLowerCase();
                      const type = (row.properties?.type || "").toLowerCase();
                      const hasPhone = desc.includes("phone") || desc.includes("call") || desc.includes("+") || type === "phone";
                      const hasEmail = desc.includes("email") || desc.includes("@") || type === "email";
                      const hasBank = desc.includes("bank") || desc.includes("fiat");
                      
                      return (
                      <TableRow key={i} className="border-border/50 hover:bg-secondary/40 transition-colors cursor-pointer" onClick={() => setSelectedNode(row)}>
                        <TableCell className="font-mono text-xs max-w-[200px] truncate px-4 py-3" title={row.properties?.id}>{row.properties?.id}</TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge variant="outline" className={`text-xs whitespace-nowrap bg-blue-500/10 text-blue-400 border-blue-500/50`}>
                            {row.properties?.crypto_type || (row.properties?.type === "Wallet" ? "Unknown" : "N/A")}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            {hasPhone && <Phone className="w-4 h-4 text-orange-400" title="Phone Linked" />}
                            {hasEmail && <Mail className="w-4 h-4 text-blue-400" title="Email Linked" />}
                            {hasBank && <Activity className="w-4 h-4 text-green-400" title="Bank Linked" />}
                            {(!hasPhone && !hasEmail && !hasBank) && <span className="text-xs">None</span>}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs text-muted-foreground max-w-[150px] truncate">
                           {row.properties?.source_url && row.properties?.source_url !== "Unknown" ? (
                             <a href={row.properties.source_url.startsWith('http') ? row.properties.source_url : `https://${row.properties.source_url}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
                               <ExternalLink className="w-3 h-3 flex-shrink-0" /> {(() => {
                                 try {
                                   return new URL(row.properties.source_url).hostname;
                                 } catch {
                                   return row.properties.source_url;
                                 }
                               })()}
                             </a>
                           ) : (
                             "Unknown"
                           )}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {row.properties?.last_seen ? new Date(row.properties.last_seen).toLocaleDateString() : (row.properties?.timestamp ? new Date(row.properties.timestamp).toLocaleDateString() : "N/A")}
                        </TableCell>
                        <TableCell className="text-right font-medium px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${getCategoryColor(row.properties?.category)}`}>
                              {row.properties?.category || "Unknown"}
                            </Badge>
                            <span className={`${row.properties?.score > 50 ? 'text-red-400 font-bold' : ''}`}>
                              {row.properties?.score > 50 && <ShieldAlert className="w-3 h-3 inline mr-1" />}{row.properties?.score || 0}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )})}
                    {filteredNodes.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                              No intelligence nodes match the current filter criteria.
                            </TableCell>
                        </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        ) : activeTab === "Evidence Vault" ? (
          <LiveScraperPanel globalNodes={nodes} globalEdges={edges} />
        ) : activeTab === "Manual Intel Drop" ? (
          <ManualIntelDropPanel />
        ) : activeTab === "Ask AI Search" ? (
          <AskAIPanel />
        ) : activeTab === "Risk Alerts" ? (
          <RiskAlertsPanel />
        ) : activeTab === "Agent Traces" ? (
          <AgentTracesPanel globalEdges={edges} globalNodes={nodes} />
        ) : activeTab === "System Config" ? (
          <SystemConfigPanel />
        ) : (
          <div className="flex flex-col items-center justify-center h-full opacity-50">
            <Cpu className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold tracking-tight">Module Sandbox Offline</h2>
            <p className="text-muted-foreground mt-2">The {activeTab} module is restricted for this terminal.</p>
            <button onClick={() => setActiveTab("Intelligence Graph")} className="mt-6 px-4 py-2 bg-primary/20 text-primary rounded-md border border-primary/50 hover:bg-primary/30 transition-colors">
              Return to Core Matrix
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function getCategoryColor(category?: string) {
  switch (category) {
    case "Narcotics": return "text-destructive border-destructive/50 bg-destructive/10";
    case "Terror Financing": return "text-destructive border-destructive/50 bg-destructive/10";
    case "Money Laundering": return "text-accent border-accent/50 bg-accent/10";
    case "Cybercrime": return "text-primary border-primary/50 bg-primary/10";
    default: return "text-muted-foreground border-border/50 bg-secondary/50";
  }
}
