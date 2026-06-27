"use client";

import React, { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, MapPin } from "lucide-react";

// GeoJSON for the world map
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Manual mapping of known test/seed locations to lat/long for demo
const LOCATION_COORDS: Record<string, [number, number]> = {
  "Moscow, Russia": [37.6173, 55.7558],
  "Russia": [105.3188, 61.5240],
  "Saint Petersburg, Russia": [30.3141, 59.9386],
  "Netherlands": [5.2913, 52.1326],
  "North Korea": [127.5101, 40.3399],
  "Unknown": [0, 0], // Map to center or hide
};

export function ThreatMap({ nodes = [] }: { nodes: any[] }) {
  const [selectedLoc, setSelectedLoc] = useState<{name: string, suspects: any[]} | null>(null);
  // Extract and aggregate locations
  const locations = useMemo(() => {
    const locMap: Record<string, { count: number; suspects: any[] }> = {};
    
    nodes.forEach(node => {
      let loc = node.properties?.estimated_location;
      if (!loc || loc === "Unknown") return;
      
      // If we don't have exact coords in our hardcoded map, we could use an API, 
      // but for the demo we'll just show the mapped ones.
      if (!LOCATION_COORDS[loc]) {
        // Try partial match
        const found = Object.keys(LOCATION_COORDS).find(k => loc.includes(k) || k.includes(loc));
        if (found) loc = found;
        else return;
      }
      
      if (!locMap[loc]) {
        locMap[loc] = { count: 0, suspects: [] };
      }
      locMap[loc].count += 1;
      locMap[loc].suspects.push(node);
    });
    
    return Object.entries(locMap).map(([name, data]) => ({
      name,
      coordinates: LOCATION_COORDS[name],
      count: data.count,
      suspects: data.suspects
    }));
  }, [nodes]);

  return (
    <Card className="border-border/50 bg-card/40 flex flex-col h-full min-h-[500px]">
      <CardHeader className="pb-3 border-b border-border/30 bg-black/20">
        <CardTitle className="flex justify-between items-center text-lg w-full">
          <span className="flex items-center gap-2"><Globe className="w-5 h-5 text-primary" /> GLOBAL THREAT HEATMAP</span>
          <span className="text-xs text-muted-foreground font-mono bg-black/50 px-2 py-1 rounded">Active Regions: {locations.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 relative bg-[#020817] overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #10b981 0%, transparent 70%)' }}></div>
        
        <ComposableMap projection="geoMercator" projectionConfig={{ scale: 130 }} className="w-full h-full">
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#1e293b"
                  stroke="#334155"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { fill: "#334155", outline: "none" },
                    pressed: { fill: "#1e293b", outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>
          
          {locations.map((loc, i) => (
            <Marker key={i} coordinates={loc.coordinates} onClick={() => setSelectedLoc(loc)}>
              <g className="cursor-pointer group">
                <circle r={loc.count * 2 + 4} fill="#ef4444" opacity={0.6} className="animate-ping" />
                <circle r={loc.count * 2 + 4} fill="#ef4444" stroke="#fff" strokeWidth={1} />
                
                {/* Tooltip on hover */}
                <g className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <rect x="-60" y="-45" width="120" height="30" fill="rgba(0,0,0,0.9)" rx="4" ry="4" stroke="#ef4444" strokeWidth="1" />
                    <text textAnchor="middle" y="-25" style={{ fontFamily: "monospace", fontSize: "10px", fill: "white" }}>
                        {loc.name}
                    </text>
                    <text textAnchor="middle" y="-12" style={{ fontFamily: "monospace", fontSize: "10px", fill: "#f87171" }}>
                        {loc.count} suspects
                    </text>
                </g>
              </g>
            </Marker>
          ))}
        </ComposableMap>
        
        <div className="absolute bottom-4 left-4 bg-black/60 border border-border/50 p-3 rounded-md backdrop-blur-md">
            <h4 className="text-xs font-bold text-white mb-2 uppercase tracking-widest border-b border-border/50 pb-1">Legend</h4>
            <div className="flex flex-col gap-2 text-xs text-muted-foreground font-mono">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div> High Risk Activity</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Low/Moderate Risk</div>
            </div>
        </div>

        {/* Selected Location Details Panel */}
        {selectedLoc && (
          <div className="absolute top-16 right-4 w-72 bg-black/80 border border-red-500/50 p-4 rounded-md backdrop-blur-md shadow-2xl flex flex-col max-h-[80%] overflow-hidden z-10">
            <div className="flex justify-between items-center border-b border-red-500/30 pb-2 mb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">{selectedLoc.name}</h3>
              <button onClick={() => setSelectedLoc(null)} className="text-muted-foreground hover:text-white">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-1">
              {selectedLoc.suspects.map((node, i) => (
                <div key={i} className="bg-red-900/20 p-2 rounded border border-red-500/20 text-xs">
                  <div className="font-mono text-red-400 font-bold mb-1 truncate" title={node.properties?.id}>{node.properties?.id}</div>
                  <div className="text-slate-300 text-[10px] leading-tight">
                    {node.properties?.desc || `Category: ${node.properties?.category}`}
                  </div>
                  {node.properties?.score && (
                    <div className="mt-1 text-[10px] text-red-300 font-mono">Risk Score: {node.properties?.score}/100</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
