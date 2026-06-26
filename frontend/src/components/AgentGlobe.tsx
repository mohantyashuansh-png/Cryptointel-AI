"use client";
import React, { useState, useEffect, useRef } from "react";
import dynamic from 'next/dynamic';
import { Globe as GlobeIcon, Radio, Moon, Sun } from "lucide-react";

// react-globe.gl requires CSR (no SSR)
const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

export function AgentGlobe({ 
  evidence = [],
  globalNodes = [],
  globalEdges = []
}: { 
  evidence?: any[],
  globalNodes?: any[],
  globalEdges?: any[]
}) {
  const globeRef = useRef<any>();
  const [arcsData, setArcsData] = useState<any[]>([]);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [globeMode, setGlobeMode] = useState<"dark" | "light">("dark");

  // Watch for theme changes
  useEffect(() => {
    // Initial check
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkTheme(isDark);
    setGlobeMode(isDark ? "dark" : "light");

    // Set up observer to watch for class changes on <html>
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          const currentlyDark = document.documentElement.classList.contains("dark");
          setIsDarkTheme(currentlyDark);
          setGlobeMode(currentlyDark ? "dark" : "light");
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // Calculate real labels based on intercepted evidence
  const getHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
    return hash;
  };

  // Realistic cyber operation hubs (Tor exit nodes, offshore VPNs, financial centers, hacker hotspots)
  const CYBER_HUBS = [
    { lat: 55.7558, lng: 37.6173, name: "Moscow" },
    { lat: 59.9311, lng: 30.3609, name: "St. Petersburg" },
    { lat: 39.0392, lng: 125.7625, name: "Pyongyang" },
    { lat: 39.9042, lng: 116.4074, name: "Beijing" },
    { lat: 35.6892, lng: 51.3890, name: "Tehran" },
    { lat: 25.2048, lng: 55.2708, name: "Dubai" },
    { lat: -4.6796, lng: 55.4920, name: "Seychelles" },
    { lat: 8.9824, lng: -79.5199, name: "Panama City" },
    { lat: 35.1264, lng: 33.4299, name: "Cyprus" },
    { lat: 51.5074, lng: -0.1278, name: "London" },
    { lat: 52.3676, lng: 4.9041, name: "Amsterdam" },
    { lat: 40.7128, lng: -74.0060, name: "New York" },
    { lat: 37.7749, lng: -122.4194, name: "San Francisco" },
    { lat: 35.6762, lng: 139.6503, name: "Tokyo" },
    { lat: 22.3193, lng: 114.1694, name: "Hong Kong" },
    { lat: 1.3521, lng: 103.8198, name: "Singapore" },
    { lat: 50.1109, lng: 8.6821, name: "Frankfurt" },
    { lat: 47.3769, lng: 8.5417, name: "Zurich" },
    { lat: 64.1466, lng: -21.9426, name: "Reykjavik" },
    { lat: 59.4370, lng: 24.7536, name: "Tallinn" }
  ];

  // Specific Regional Mapping for Linguistic Forensics 
  const REGION_MAP: Record<string, {lat: number, lng: number}> = {
    "india": { lat: 20.5937, lng: 78.9629 },
    "russia": { lat: 61.5240, lng: 105.3188 },
    "uk": { lat: 55.3781, lng: -3.4360 },
    "united kingdom": { lat: 55.3781, lng: -3.4360 },
    "usa": { lat: 37.0902, lng: -95.7129 },
    "united states": { lat: 37.0902, lng: -95.7129 },
    "china": { lat: 35.8617, lng: 104.1954 },
    "nigeria": { lat: 9.0820, lng: 8.6753 },
    "north korea": { lat: 40.3399, lng: 127.5101 },
    "eastern europe": { lat: 49.0, lng: 31.0 },
    "middle east": { lat: 29.2985, lng: 42.5510 },
    "latin america": { lat: -15.0, lng: -60.0 },
    "southeast asia": { lat: 5.0, lng: 110.0 }
  };

  const labelsData = (globalNodes.length > 0 ? globalNodes : evidence).map(item => {
     // Neo4j node uses item.properties?.id, evidence uses item.id
     const str = item.properties?.id || item.id || item.source_url || "";
     if (!str) return null;
     
     const riskScore = item.properties?.score || item.risk_score || 0;
     const estimatedLocation = (item.properties?.estimated_location || "").toLowerCase();
     const h1 = getHash(str);
     
     // Base coordinates (fallback to cyber hub proxy)
     let finalLat = CYBER_HUBS[Math.abs(h1) % CYBER_HUBS.length].lat;
     let finalLng = CYBER_HUBS[Math.abs(h1) % CYBER_HUBS.length].lng;
     let isEstimated = false;

     // Attempt to map the Linguistic Forensics estimated location
     if (estimatedLocation && estimatedLocation !== "unknown") {
        for (const [key, coords] of Object.entries(REGION_MAP)) {
           if (estimatedLocation.includes(key)) {
              finalLat = coords.lat;
              finalLng = coords.lng;
              isEstimated = true;
              break;
           }
        }
     }
     
     // Add a tiny bit of random jitter so multiple nodes at the same hub don't perfectly overlap
     const jitterLat = (Math.abs(getHash(str + "lat")) % 100) / 100 - 0.5;
     const jitterLng = (Math.abs(getHash(str + "lng")) % 100) / 100 - 0.5;
     
     return {
        id: str,
        lat: finalLat + (isEstimated ? jitterLat * 3 : jitterLat), // slightly wider jitter for countries
        lng: finalLng + (isEstimated ? jitterLng * 3 : jitterLng),
        text: isEstimated ? `${str.split('/').pop()?.substring(0,10)} [${estimatedLocation.toUpperCase()}]` : str.split('/').pop()?.substring(0,15) || "Node",
        color: riskScore >= 70 ? '#ef4444' : '#10b981',
        size: riskScore >= 70 ? 1.5 : 0.8
     };
  }).filter(Boolean);

  useEffect(() => {
    // If we have real Neo4j edges, map those directly
    if (globalEdges.length > 0 && labelsData.length > 1) {
       const arcs = globalEdges.map(edge => {
         const sourceId = edge.start || edge.startNodeElementId || (edge.source || edge.source?.id);
         const targetId = edge.end || edge.endNodeElementId || (edge.target || edge.target?.id);
         
         const source = labelsData.find(l => l.id === sourceId);
         const target = labelsData.find(l => l.id === targetId);
         
         if (source && target) {
           return {
             startLat: source.lat,
             startLng: source.lng,
             endLat: target.lat,
             endLng: target.lng,
             color: '#ef4444' // bright red for actual transactions
           };
         }
         return null;
       }).filter(Boolean);
       
       setArcsData(arcs as any[]);
       return;
    }

    // Fallback: Generate arcs connecting actual intercepted targets randomly if no edges
    if (labelsData.length < 2) {
      setArcsData([]);
      return;
    }

    const genArcs = () => {
       const arcs = [];
       const numArcs = Math.min(20, labelsData.length * 2);
       
       for (let i = 0; i < numArcs; i++) {
         const sourceIdx = Math.floor(Math.random() * labelsData.length);
         let targetIdx = Math.floor(Math.random() * labelsData.length);
         while (targetIdx === sourceIdx && labelsData.length > 1) {
            targetIdx = Math.floor(Math.random() * labelsData.length);
         }
         
         const source = labelsData[sourceIdx];
         const target = labelsData[targetIdx];
         
         arcs.push({
           startLat: source.lat,
           startLng: source.lng,
           endLat: target.lat,
           endLng: target.lng,
           color: ['#ef4444', '#f87171', '#b91c1c'][Math.floor(Math.random() * 3)]
         });
       }
       return arcs;
    };

    setArcsData(genArcs());
    const interval = setInterval(() => setArcsData(genArcs()), 4000);
    return () => clearInterval(interval);
  }, [labelsData.length, globalEdges]);

  useEffect(() => {
    // Auto-rotate
    setTimeout(() => {
      if (globeRef.current && globeRef.current.controls) {
        globeRef.current.controls().autoRotate = true;
        globeRef.current.controls().autoRotateSpeed = 1.0;
      }
    }, 1000);
  }, []);

  return (
    <div className={`relative w-full h-full flex flex-col items-center justify-center border border-border/50 rounded-lg overflow-hidden group ${globeMode === "dark" ? 'bg-black/60' : 'bg-secondary/30'}`}>
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
         <GlobeIcon className="w-4 h-4 text-primary" />
         <span className="text-xs font-mono font-bold text-primary tracking-widest">GLOBAL TRACE OVERVIEW</span>
      </div>
      <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
        <button 
           onClick={() => setGlobeMode(prev => prev === "dark" ? "light" : "dark")}
           className={`p-1.5 rounded backdrop-blur-sm border transition-colors ${globeMode === "dark" ? 'bg-black/50 border-border/30 text-muted-foreground hover:text-white' : 'bg-white/80 border-border/50 shadow-sm text-muted-foreground hover:text-black'}`}
           title="Toggle Globe Map Style"
        >
           {globeMode === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
        <div className={`flex items-center gap-2 px-2 py-1 border rounded backdrop-blur-sm ${globeMode === "dark" ? 'bg-black/50 border-primary/20' : 'bg-white/80 border-border/50 shadow-sm'}`}>
           <Radio className="w-3 h-3 text-red-500 animate-pulse" />
           <span className="text-[10px] font-mono text-muted-foreground uppercase">Live Intercepts</span>
        </div>
      </div>
      
      <div className="absolute inset-0 cursor-move flex items-center justify-center">
        <Globe
          ref={globeRef}
          globeImageUrl={globeMode === "dark" ? "//unpkg.com/three-globe/example/img/earth-dark.jpg" : "//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"}
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundImageUrl={globeMode === "dark" ? "//unpkg.com/three-globe/example/img/night-sky.png" : ""}
          showAtmosphere={true}
          atmosphereColor={globeMode === "dark" ? "lightskyblue" : "white"}
          atmosphereAltitude={0.15}
          arcsData={arcsData}
          arcColor="color"
          arcDashLength={() => Math.random()}
          arcDashGap={() => Math.random()}
          arcDashAnimateTime={() => Math.random() * 4000 + 500}
          labelsData={labelsData}
          labelLat={d => (d as any).lat}
          labelLng={d => (d as any).lng}
          labelText={d => (d as any).text}
          labelSize={d => (d as any).size}
          labelDotRadius={d => (d as any).size / 2}
          labelColor={d => (d as any).color}
          labelResolution={2}
          backgroundColor="rgba(0,0,0,0)"
        />
      </div>
      
      {/* HUD overlay effects */}
      <div className={`absolute inset-0 pointer-events-none ${globeMode === "dark" ? 'shadow-[inset_0_0_100px_rgba(0,0,0,0.9)]' : 'shadow-[inset_0_0_80px_rgba(255,255,255,0.8)]'}`} />
      <div className={`absolute bottom-4 right-4 z-10 p-2 rounded border backdrop-blur-sm ${globeMode === "dark" ? 'bg-black/50 border-border/30' : 'bg-white/80 border-border/50 shadow-sm'}`}>
         <div className="text-[10px] font-mono text-muted-foreground text-right leading-tight opacity-50 group-hover:opacity-100 transition-opacity">
            OSINT Swarm: Active<br/>
            Identified Targets: {labelsData.length}<br/>
            Global Network Streams: {arcsData.length}
         </div>
      </div>
    </div>
  );
}
