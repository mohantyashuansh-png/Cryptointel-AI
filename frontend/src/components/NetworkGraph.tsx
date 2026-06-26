"use client";

import React, { useRef, useEffect, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { useTheme } from "next-themes";
import { Minimize2, Maximize2, List } from "lucide-react";

export default function NetworkGraph({ nodes, edges, onNodeClick, recenterTrigger }: { nodes: any[], edges: any[], onNodeClick?: (node: any) => void, recenterTrigger?: number }) {
  const fgRef = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLegendOpen, setIsLegendOpen] = useState(true);

  // Resize observer to make graph responsive to the container
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (fgRef.current && recenterTrigger > 0) {
      // Guaranteed safe recenter that never calculates a NaN bounding box
      fgRef.current.centerAt(0, 0, 400);
      fgRef.current.zoom(1.2, 400);
    }
  }, [recenterTrigger]);

  // Format nodes and edges for the graph
  // react-force-graph modifies these objects (adds x, y, vx, vy), so we clone them
  const graphData = React.useMemo(() => {
    const safeLinks: any[] = [];
    const adj = new Map<string, any[]>();
    
    nodes.forEach(n => adj.set(n.properties.id, []));
    edges.forEach(e => {
      const src = e.source?.id || e.source;
      if (!adj.has(src)) adj.set(src, []);
      adj.get(src)!.push(e);
    });

    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (nodeId: string) => {
      visited.add(nodeId);
      recStack.add(nodeId);

      const outEdges = adj.get(nodeId) || [];
      for (const edge of outEdges) {
        const tgt = edge.target?.id || edge.target;
        if (!recStack.has(tgt)) {
          safeLinks.push({
            source: edge.source,
            target: edge.target,
            relation: edge.relation,
            ...edge
          });
          if (!visited.has(tgt)) {
            dfs(tgt);
          }
        }
      }
      recStack.delete(nodeId);
    };

    nodes.forEach(n => {
      const id = n.properties.id;
      if (!visited.has(id)) dfs(id);
    });

    return {
      nodes: nodes.map(n => ({ ...n.properties, type: n.labels ? n.labels[0] : "Unknown", originalId: n.properties.id })),
      links: safeLinks
    };
  }, [nodes, edges]);

  // But wait, the nodes need an 'id' property. `properties.id` is what we have.
  // The edges need 'source' and 'target' which map to node 'id's.

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ minHeight: '400px' }}>
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        nodeId="id"
        dagMode="lr"
        dagLevelDistance={80}
        onNodeClick={onNodeClick}
        nodeRelSize={6}
        nodeVal={(node: any) => Math.max(4, (node.score || 10) / 10)}
        linkColor={(link: any) => link.relation === 'TRANSACTED_WITH' ? 'rgba(34, 197, 94, 0.6)' : 'rgba(100, 116, 139, 0.4)'}
        linkDirectionalParticles={(link: any) => link.relation === 'TRANSACTED_WITH' ? 5 : 2}
        linkDirectionalParticleWidth={(link: any) => link.relation === 'TRANSACTED_WITH' ? 3 : 1.5}
        linkDirectionalParticleSpeed={(link: any) => link.relation === 'TRANSACTED_WITH' ? 0.02 : 0.01}
        linkDirectionalParticleColor={(link: any) => link.relation === 'TRANSACTED_WITH' ? '#22c55e' : undefined}
        linkCurvature={0.2}
        backgroundColor="transparent"
        linkCanvasObjectMode={() => 'after'}
        linkCanvasObject={(link: any, ctx, globalScale) => {
          const start = link.source;
          const end = link.target;
          if (typeof start !== 'object' || typeof end !== 'object') return;

          const label = link.relation || '';
          if (globalScale > 2 && label) {
            const MAX_FONT_SIZE = 4 / globalScale;
            const textPos = {
              x: start.x + (end.x - start.x) / 2,
              y: start.y + (end.y - start.y) / 2
            };
            const relLink = { x: end.x - start.x, y: end.y - start.y };
            let textAngle = Math.atan2(relLink.y, relLink.x);
            if (textAngle > Math.PI / 2) textAngle = -(Math.PI - textAngle);
            if (textAngle < -Math.PI / 2) textAngle = -(-Math.PI - textAngle);

            ctx.save();
            ctx.translate(textPos.x, textPos.y);
            ctx.rotate(textAngle);
            ctx.font = `${MAX_FONT_SIZE * 3}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(-textWidth / 2 - 1, -MAX_FONT_SIZE * 1.5, textWidth + 2, MAX_FONT_SIZE * 3);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText(label, 0, 0);
            ctx.restore();
          }
        }}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.id;
          const fontSize = 12 / globalScale;
          const radius = Math.max(4, (node.score || 10) / 10);
          
          let color = '#64748b'; // default muted
          if (node.category === 'Narcotics' || node.category === 'Terror Financing') color = '#ef4444';
          else if (node.category === 'Money Laundering') color = '#06b6d4';
          else if (node.category === 'Cybercrime') color = '#10b981';

          // Draw Glow
          ctx.shadowColor = color;
          ctx.shadowBlur = 10;
          
          ctx.beginPath();
          if (node.type === "Wallet") {
            // Draw Node Circle for Wallets
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
          } else {
            // Draw Diamond for Suspects / Others
            ctx.moveTo(node.x, node.y - radius);
            ctx.lineTo(node.x + radius, node.y);
            ctx.lineTo(node.x, node.y + radius);
            ctx.lineTo(node.x - radius, node.y);
            ctx.closePath();
          }
          ctx.fillStyle = color;
          ctx.fill();
          
          // Reset shadow for text
          ctx.shadowBlur = 0;

          // Draw Label if zoomed in enough
          if (globalScale > 1.5) {
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText(label.length > 15 ? label.substring(0, 15) + '...' : label, node.x, node.y + radius + 2);
          }
        }}
        onEngineStop={() => {
          if (fgRef.current) {
            // zoomToFit is too buggy on sparse graphs, use absolute positioning
            fgRef.current.centerAt(0, 0, 400);
            fgRef.current.zoom(1.2, 400);
          }
        }}
      />

      {/* Legend has been moved to the unified system legends box in page.tsx */}
    </div>
  );
}
