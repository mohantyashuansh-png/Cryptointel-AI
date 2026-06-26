import { useState } from "react";
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
  Menu
} from "lucide-react";

export function Sidebar({ activeTab = "Intelligence Graph", onTabChange = () => {} }: { activeTab?: string, onTabChange?: (tab: string) => void }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} transition-all duration-300 border-r border-border bg-card/30 flex flex-col h-screen sticky top-0`}>
      <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && (
          <div>
            <h1 className="text-xl font-bold tracking-tighter text-primary flex items-center gap-2">
              <img src="/logo.png" alt="CryptoIntel Logo" className="w-8 h-8 rounded-md shadow-sm shadow-primary/20" />
              CryptoIntel
            </h1>
            <p className="text-xs text-muted-foreground mt-1 tracking-widest uppercase">Autonomous Core</p>
          </div>
        )}
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="text-muted-foreground hover:text-foreground">
          {isCollapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 mt-4">
        <NavItem isCollapsed={isCollapsed} icon={<Network className="w-4 h-4" />} label="Intelligence Graph" active={activeTab === "Intelligence Graph"} onClick={() => onTabChange("Intelligence Graph")} />
        <NavItem isCollapsed={isCollapsed} icon={<Database className="w-4 h-4" />} label="Evidence Vault" active={activeTab === "Evidence Vault"} onClick={() => onTabChange("Evidence Vault")} />
        <NavItem isCollapsed={isCollapsed} icon={<FileText className="w-4 h-4" />} label="Manual Intel Drop" active={activeTab === "Manual Intel Drop"} onClick={() => onTabChange("Manual Intel Drop")} />
        <NavItem isCollapsed={isCollapsed} icon={<Brain className="w-4 h-4" />} label="Ask AI Search" active={activeTab === "Ask AI Search"} onClick={() => onTabChange("Ask AI Search")} />
        <NavItem isCollapsed={isCollapsed} icon={<ShieldAlert className="w-4 h-4" />} label="Risk Alerts" active={activeTab === "Risk Alerts"} onClick={() => onTabChange("Risk Alerts")} />
        <NavItem isCollapsed={isCollapsed} icon={<TerminalSquare className="w-4 h-4" />} label="Agent Traces" active={activeTab === "Agent Traces"} onClick={() => onTabChange("Agent Traces")} />
      </nav>

      <div className="p-4 border-t border-border mt-auto">
        <NavItem isCollapsed={isCollapsed} icon={<Settings className="w-4 h-4" />} label="System Config" active={activeTab === "System Config"} onClick={() => onTabChange("System Config")} />
        {!isCollapsed && (
          <div className="mt-4 px-3 text-xs text-muted-foreground flex items-center justify-between">
            <span>Swarm Status:</span>
            <span className="flex items-center gap-1.5 text-primary">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Online
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick, isCollapsed = false }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void, isCollapsed?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-md transition-colors text-sm font-medium ${
        active 
          ? "bg-primary/10 text-primary border border-primary/20" 
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent"
      }`}
    >
      {icon}
      {!isCollapsed && <span>{label}</span>}
    </button>
  );
}
