"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });
import { Maximize2, Minimize2, Layers, MapPin } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function RiskClustersGraph({ nodes, edges }: { nodes: any[], edges: any[] }) {
  const fgRef = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [clusterMode, setClusterMode] = useState<"LOCATION" | "CATEGORY">("LOCATION");

  // Responsive resize
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute Macro Clusters
  const graphData = useMemo(() => {
    const clusterMap = new Map<string, any>();
    const nodeToCluster = new Map<string, string>();

    // 1. Build Clusters
    nodes.forEach(n => {
      const p = n.properties || {};
      let key = "Unknown";
      
      if (clusterMode === "LOCATION") {
        key = p.estimated_location && p.estimated_location.trim() !== "" ? p.estimated_location : "Unknown";
      } else {
        key = p.category && p.category.trim() !== "" ? p.category : "Unknown";
      }
      
      // Capitalize first letter for cleanliness
      key = key.charAt(0).toUpperCase() + key.slice(1);
      
      nodeToCluster.set(p.id, key);

      if (!clusterMap.has(key)) {
        clusterMap.set(key, {
          id: key,
          name: key,
          count: 0,
          totalScore: 0,
          type: "Cluster"
        });
      }
      const cluster = clusterMap.get(key);
      cluster.count += 1;
      cluster.totalScore += (p.score || 0);
    });

    // 2. Build Macro Edges
    const edgeMap = new Map<string, any>();
    edges.forEach(e => {
      const srcId = typeof e.source === 'object' ? e.source.id : e.source;
      const tgtId = typeof e.target === 'object' ? e.target.id : e.target;
      
      const srcKey = nodeToCluster.get(srcId);
      const tgtKey = nodeToCluster.get(tgtId);
      
      if (srcKey && tgtKey && srcKey !== tgtKey) {
        const edgeId = `${srcKey}___${tgtKey}`;
        // Also check reverse to just accumulate undirected weights if desired, 
        // but directed flow is cool.
        if (!edgeMap.has(edgeId)) {
          edgeMap.set(edgeId, {
            source: srcKey,
            target: tgtKey,
            weight: 0,
            relation: clusterMode === "LOCATION" ? "FUNDS_FLOW" : "SYNDICATE_LINK"
          });
        }
        edgeMap.get(edgeId).weight += 1;
      }
    });

    return {
      nodes: Array.from(clusterMap.values()),
      links: Array.from(edgeMap.values())
    };
  }, [nodes, edges, clusterMode]);

  // Handle zoom to fit
  useEffect(() => {
    if (fgRef.current && graphData.nodes.length > 0) {
      setTimeout(() => {
        if (fgRef.current && fgRef.current.zoomToFit) {
          try {
            fgRef.current.zoomToFit(400, 50);
          } catch (e) {
            // Ignore zoom error if component unmounted
          }
        }
      }, 500);
    }
  }, [graphData, dimensions]);

  return (
    <Card className={`border-border/50 bg-black/40 flex flex-col ${isFullscreen ? 'fixed inset-4 z-[100] bg-background/95 backdrop-blur-md' : 'h-[700px]'}`}>
      <CardHeader className="pb-3 border-b border-border/30 bg-black/20 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg text-primary font-mono tracking-wider">
          <Layers className="w-5 h-5 text-purple-500" /> MACRO RISK CLUSTERS
        </CardTitle>
        <div className="flex gap-4 items-center">
          <div className="flex bg-black/50 p-1 rounded-md border border-border/50">
            <button
              onClick={() => setClusterMode("LOCATION")}
              className={`px-3 py-1 text-xs font-mono rounded transition-colors flex items-center gap-2 ${clusterMode === "LOCATION" ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-white'}`}
            >
              <MapPin className="w-3 h-3" /> By Location
            </button>
            <button
              onClick={() => setClusterMode("CATEGORY")}
              className={`px-3 py-1 text-xs font-mono rounded transition-colors flex items-center gap-2 ${clusterMode === "CATEGORY" ? 'bg-destructive/20 text-destructive' : 'text-muted-foreground hover:text-white'}`}
            >
              <Layers className="w-3 h-3" /> By Category
            </button>
          </div>
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="text-muted-foreground hover:text-white"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 relative" ref={containerRef}>
        {graphData.nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground font-mono">
            No cluster data available.
          </div>
        ) : (
          <ForceGraph2D
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            nodeId="id"
            nodeRelSize={8}
            d3VelocityDecay={0.3}
            backgroundColor="transparent"
            linkColor={() => 'rgba(100, 116, 139, 0.4)'}
            linkWidth={(link: any) => Math.min(10, Math.max(1, link.weight || 1))}
            linkDirectionalParticles={(link: any) => link.weight ? Math.min(5, link.weight) : 1}
            linkDirectionalParticleSpeed={0.01}
            linkDirectionalParticleColor={() => clusterMode === "LOCATION" ? '#22c55e' : '#ef4444'}
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              const label = node.name;
              // Size based on count of entities inside this cluster
              const radius = Math.max(10, Math.min(40, node.count * 3));
              
              let color = clusterMode === "LOCATION" ? '#3b82f6' : '#ef4444';
              if (node.name === "Unknown") color = '#64748b';

              // Draw Glowing Circle
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
              ctx.fillStyle = color;
              ctx.globalAlpha = 0.8;
              ctx.shadowColor = color;
              ctx.shadowBlur = 15;
              ctx.fill();
              ctx.globalAlpha = 1;
              ctx.shadowBlur = 0;

              // Draw Text inside/over
              const fontSize = Math.max(4, 16 / globalScale);
              ctx.font = `bold ${fontSize}px Sans-Serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#ffffff';
              ctx.fillText(label, node.x, node.y - 2);
              
              // Subtitle (count & score)
              ctx.font = `${fontSize * 0.7}px Sans-Serif`;
              ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
              ctx.fillText(`${node.count} Entities | Risk: ${node.totalScore}`, node.x, node.y + fontSize);
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
