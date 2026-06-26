"use client";

import React, { useState } from "react";
import { Brain, Search, Send, Loader2, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AskAIPanel() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string, sources?: number}[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!query.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setLoading(true);
    setQuery("");

    try {
      const res = await fetch("http://localhost:8000/api/v1/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() })
      });
      
      const data = await res.json();
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: data.answer || "Error connecting to AI.", 
        sources: data.sources 
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: "Failed to connect to backend server." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/50 bg-card/40 flex flex-col h-[700px]">
      <CardHeader className="pb-3 border-b border-border/30 bg-black/20">
        <CardTitle className="flex justify-between items-center text-lg">
          <span className="flex items-center gap-2"><Brain className="w-5 h-5 text-purple-500" /> SEMANTIC SEARCH (Ask AI)</span>
          <Badge variant="outline" className="font-mono text-xs text-muted-foreground bg-background/50 flex gap-2">
            <Database className="w-3 h-3 text-blue-500" /> LanceDB + Groq Llama-3
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 flex-1 flex flex-col gap-4 overflow-hidden relative">
        <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4 font-mono text-sm">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 gap-4">
              <Brain className="w-16 h-16" />
              <p>Ask anything about the intercepted data.</p>
              <div className="text-xs text-center max-w-sm">
                "Are there any wallets linked to Terror Financing?"<br/>
                "What is the contact email for ShadowBroker99?"
              </div>
            </div>
          )}
          
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col gap-1.5 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`text-[10px] uppercase tracking-widest text-muted-foreground flex gap-2 items-center`}>
                {m.role === 'user' ? 'ANALYST QUERY' : 'CRYPTOINTEL AI'}
                {m.sources !== undefined && m.sources > 0 && (
                  <span className="text-blue-500">[{m.sources} SOURCES]</span>
                )}
              </div>
              <div className={`p-3 rounded-md max-w-[85%] whitespace-pre-wrap ${
                m.role === 'user' 
                  ? 'bg-primary/20 border border-primary/30 text-primary-foreground' 
                  : 'bg-black/40 border border-border/50 text-muted-foreground'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex flex-col gap-1.5 items-start">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">CRYPTOINTEL AI</div>
              <div className="p-3 rounded-md bg-black/40 border border-border/50 text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                Querying LanceDB vectors & generating response...
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-auto relative">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            placeholder="Search the evidence vault..."
            className="w-full bg-black/50 border border-border/50 rounded-md py-3 pl-10 pr-12 text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            disabled={loading}
          />
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
          <button 
            onClick={handleAsk}
            disabled={loading || !query.trim()}
            className="absolute right-2 top-2 p-1.5 bg-primary/20 text-primary rounded hover:bg-primary/40 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
