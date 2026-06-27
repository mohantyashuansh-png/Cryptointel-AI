import { useState, useEffect } from "react";
import { 
  Activity, 
  Database, 
  Network, 
  ShieldAlert, 
  Settings,
  TerminalSquare,
  FileText,
  Brain,
  ChevronLeft,
  Menu,
  Globe,
  Layers
} from "lucide-react";

export function Sidebar({ activeTab = "Intelligence Graph", onTabChange = () => {}, alertCount = 0 }: { activeTab?: string, onTabChange?: (tab: string) => void, alertCount?: number }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} transition-all duration-[400ms] border-r border-transparent bg-card/30 flex flex-col h-screen sticky top-0 z-50`} style={{ borderRightImage: 'linear-gradient(to bottom, transparent, rgba(28,231,239,0.3), transparent) 1' }}>
      <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && (
          <div>
            <h1 className="text-xl font-bold tracking-tighter text-primary flex items-center gap-2">
              <img src="/logo.png" alt="CryptoIntel Logo" className="w-8 h-8 rounded-md shadow-sm shadow-primary/20" />
              <SidebarGlitchText text="CryptoIntel" />
            </h1>
            <p className="text-[10px] text-white/40 mt-1 tracking-[0.15em] uppercase font-bold">Autonomous Core</p>
          </div>
        )}
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="text-muted-foreground hover:text-foreground">
          {isCollapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 mt-4">
        <NavItem isCollapsed={isCollapsed} icon={<Network className="w-4 h-4" />} label="Intelligence Graph" active={activeTab === "Intelligence Graph"} onClick={() => onTabChange("Intelligence Graph")} />
        <NavItem isCollapsed={isCollapsed} icon={<Globe className="w-4 h-4" />} label="Threat Map" active={activeTab === "Threat Map"} onClick={() => onTabChange("Threat Map")} />
        <NavItem isCollapsed={isCollapsed} icon={<Layers className="w-4 h-4 text-purple-400" />} label="Risk Clusters" active={activeTab === "Risk Clusters"} onClick={() => onTabChange("Risk Clusters")} />
        <NavItem isCollapsed={isCollapsed} icon={<Database className="w-4 h-4" />} label="Evidence Vault" active={activeTab === "Evidence Vault"} onClick={() => onTabChange("Evidence Vault")} />
        <NavItem isCollapsed={isCollapsed} icon={<FileText className="w-4 h-4" />} label="Manual Intel Drop" active={activeTab === "Manual Intel Drop"} onClick={() => onTabChange("Manual Intel Drop")} />
        <NavItem isCollapsed={isCollapsed} icon={<AskAIIcon />} label="Ask AI Search" active={activeTab === "Ask AI Search"} onClick={() => onTabChange("Ask AI Search")} />
        <NavItem isCollapsed={isCollapsed} icon={<ShieldAlert className="w-4 h-4" />} label="Risk Alerts" active={activeTab === "Risk Alerts"} onClick={() => onTabChange("Risk Alerts")} badge={alertCount} />
        <NavItem isCollapsed={isCollapsed} icon={<TerminalSquare className="w-4 h-4" />} label="Agent Traces" active={activeTab === "Agent Traces"} onClick={() => onTabChange("Agent Traces")} />
      </nav>

      <div className="p-4 border-t border-border mt-auto">
        <NavItem isCollapsed={isCollapsed} icon={<Settings className="w-4 h-4" />} label="System Config" active={activeTab === "System Config"} onClick={() => onTabChange("System Config")} />
        {!isCollapsed && (
          <>
            <div className="mt-4 px-3 text-[10px] text-white/50 uppercase tracking-widest font-bold flex items-center justify-between">
              <span>Swarm Status:</span>
              <span className="flex items-center gap-1.5 text-primary">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_hsl(var(--primary))]" />
                Online
              </span>
            </div>
            
            {/* System Vitality Bar */}
            <div className="mt-4 px-3">
              <div className="flex justify-between text-[9px] text-white/30 uppercase tracking-widest mb-1.5 font-bold">
                <span>System Memory</span>
                <span className="text-primary/70">64%</span>
              </div>
              <div className="h-1 w-full bg-black/50 rounded-full overflow-hidden">
                <div className="h-full bg-primary/70 shadow-[0_0_10px_hsl(var(--primary))]" style={{ width: '64%' }}></div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SidebarGlitchText({ text, duration = 1000 }: { text: string, duration?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [isGlitching, setIsGlitching] = useState(true);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGlitching) {
      interval = setInterval(() => {
        setDisplayed(text.split('').map(c => Math.random() > 0.5 ? chars[Math.floor(Math.random() * chars.length)] : c).join(''));
      }, 50);
      setTimeout(() => {
        setIsGlitching(false);
        setDisplayed(text);
        clearInterval(interval);
      }, duration);
    } else {
      setDisplayed(text);
    }
    return () => clearInterval(interval);
  }, [text, duration, isGlitching]);
  
  return <span className={isGlitching ? "font-mono font-bold" : ""}>{displayed}</span>;
}

function AskAIIcon() {
  return <Brain className="w-4 h-4" />;
}

function NavItem({ icon, label, active = false, onClick, isCollapsed = false, badge }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void, isCollapsed?: boolean, badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`group relative w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-md transition-all duration-300 text-sm font-medium ${
        active 
          ? "bg-gradient-to-r from-primary/20 to-primary/5 text-primary border-transparent shadow-[inset_3px_0_0_hsl(var(--primary)),0_0_18px_rgba(28,231,239,0.22)]" 
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent"
      }`}
    >
      <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'gap-3 overflow-hidden'}`}>
        {icon}
        {!isCollapsed && <span className="whitespace-nowrap animate-content-entry">{label}</span>}
      </div>
      
      {!isCollapsed && badge !== undefined && badge > 0 && (
        <span className="bg-red-500/20 text-red-500 border border-red-500/50 text-[10px] px-1.5 py-0.5 rounded-full font-bold animate-alert-pulse">
          {badge}
        </span>
      )}
      
      {isCollapsed && badge !== undefined && badge > 0 && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-alert-pulse" />
      )}

      {isCollapsed && (
        <div className="absolute left-full ml-3 px-3 py-1.5 bg-black/90 backdrop-blur-md border border-primary/30 text-primary text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-[100] shadow-[0_0_15px_rgba(28,231,239,0.15)] pointer-events-none">
          {label}
        </div>
      )}
    </button>
  );
}
