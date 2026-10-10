import React, { useState, useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import type { Core, NodeSingular, EdgeSingular } from 'cytoscape';
import {
  Share2,
  Maximize2,
  RotateCcw,
  Search,
  Info,
} from 'lucide-react';
import { useCase } from '../context/CaseContext';
import { api } from '../api/client';
import type { GraphData, GraphNode, GraphEdge } from '../types';
import { Badge } from '../components/Badge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';

const NODE_COLORS: Record<string, string> = {
  EVIDENCE: '#A78BFA',
  EMAIL: '#FBBF24',
  URL: '#67E8F9',
  DOMAIN: '#38BDF8',
  IP_ADDRESS: '#34D399',
  FILE_HASH: '#C084FC',
  USER_ACCOUNT: '#F472B6',
  HOST_DEVICE: '#60A5FA',
  FINDING: '#F87171',
};

const NODE_SHAPES: Record<string, any> = {
  EVIDENCE: 'round-rectangle',
  EMAIL: 'ellipse',
  URL: 'round-rectangle',
  DOMAIN: 'diamond',
  IP_ADDRESS: 'hexagon',
  FILE_HASH: 'octagon',
  USER_ACCOUNT: 'rectangle',
  HOST_DEVICE: 'triangle',
  FINDING: 'star',
};

export const GraphPage: React.FC = () => {
  const { activeCase, notify } = useCase();
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLayout, setActiveLayout] = useState<'cose' | 'concentric' | 'circle' | 'grid'>('cose');

  // Entity Type Filter toggles
  const [visibleTypes, setVisibleTypes] = useState<Record<string, boolean>>({
    EVIDENCE: true,
    EMAIL: true,
    URL: true,
    DOMAIN: true,
    IP_ADDRESS: true,
    FILE_HASH: true,
    USER_ACCOUNT: true,
    HOST_DEVICE: true,
    FINDING: true,
  });

  useEffect(() => {
    if (activeCase) {
      loadGraph();
    } else {
      setGraphData(null);
    }
  }, [activeCase]);

  const loadGraph = async () => {
    if (!activeCase) return;
    try {
      setLoading(true);
      const data = await api.getGraph(activeCase.id);
      setGraphData(data);
    } catch (err: any) {
      notify(`Failed to load graph: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Initialize and update Cytoscape canvas
  useEffect(() => {
    if (!containerRef.current || !graphData) return;

    // Filter nodes by visible types
    const filteredNodes = graphData.nodes.filter(
      (n) => visibleTypes[n.type] !== false
    );
    const visibleNodeIds = new Set(filteredNodes.map((n) => n.id));

    const filteredEdges = graphData.edges.filter(
      (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    );

    const elements: cytoscape.ElementDefinition[] = [
      ...filteredNodes.map((n) => ({
        data: {
          id: n.id,
          label: n.label,
          type: n.type,
          color: NODE_COLORS[n.type] || '#A1A1AA',
          shape: NODE_SHAPES[n.type] || 'ellipse',
          raw: n,
        },
      })),
      ...filteredEdges.map((e) => ({
        data: {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
          raw: e,
        },
      })),
    ];

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            label: 'data(label)',
            color: '#F3F4F6',
            'font-size': '11px',
            'text-valign': 'bottom',
            'text-margin-y': 5,
            'text-background-opacity': 0.8,
            'text-background-color': '#17171D',
            'text-background-padding': '3px',
            'text-background-shape': 'roundrectangle',
            width: 34,
            height: 34,
            shape: 'data(shape)' as any,
            'border-width': 2,
            'border-color': '#343440',
            'transition-property': 'background-color, border-color, opacity',
            'transition-duration': 0.2,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.8,
            'line-color': '#4A4A5A',
            'target-arrow-color': '#4A4A5A',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            label: 'data(label)',
            'font-size': '9px',
            color: '#A1A1AA',
            'text-rotation': 'autorotate',
            'text-background-opacity': 0.8,
            'text-background-color': '#111116',
            'text-background-padding': '2px',
          },
        },
        {
          selector: '.highlighted',
          style: {
            'border-color': '#C4B5FD',
            'border-width': 4,
            opacity: 1,
          },
        },
        {
          selector: '.edge-highlighted',
          style: {
            'line-color': '#A78BFA',
            'target-arrow-color': '#A78BFA',
            width: 3,
            opacity: 1,
          },
        },
        {
          selector: '.dimmed',
          style: {
            opacity: 0.18,
          },
        },
      ],
      layout: {
        name: activeLayout,
        animate: true,
        animationDuration: 500,
        padding: 50,
      } as any,
    });

    // Node selection
    cy.on('tap', 'node', (evt) => {
      const node = evt.target as NodeSingular;
      const rawNode = node.data('raw') as GraphNode;
      setSelectedNode(rawNode);
      setSelectedEdge(null);

      // Highlight neighborhood
      cy.elements().removeClass('highlighted edge-highlighted dimmed');
      cy.elements().addClass('dimmed');

      node.removeClass('dimmed').addClass('highlighted');
      node.neighborhood().removeClass('dimmed').addClass('highlighted');
      node.connectedEdges().removeClass('dimmed').addClass('edge-highlighted');
    });

    // Edge selection
    cy.on('tap', 'edge', (evt) => {
      const edge = evt.target as EdgeSingular;
      const rawEdge = edge.data('raw') as GraphEdge;
      setSelectedEdge(rawEdge);
      setSelectedNode(null);

      cy.elements().removeClass('highlighted edge-highlighted dimmed');
      edge.addClass('edge-highlighted');
      edge.connectedNodes().addClass('highlighted');
    });

    // Background tap
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedNode(null);
        setSelectedEdge(null);
        cy.elements().removeClass('highlighted edge-highlighted dimmed');
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [graphData, visibleTypes, activeLayout]);

  const handleSearchNode = () => {
    if (!cyRef.current || !searchQuery) return;
    const cy = cyRef.current;
    const matches = cy.nodes().filter((n) =>
      n.data('label').toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (matches.length > 0) {
      cy.elements().removeClass('highlighted edge-highlighted dimmed');
      matches.addClass('highlighted');
      cy.animate({
        center: { eles: matches },
        zoom: 1.5,
        duration: 400,
      });
      setSelectedNode(matches[0].data('raw'));
    } else {
      notify('No matching entity node found in graph.', 'info');
    }
  };

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.animate({ fit: { eles: cyRef.current.elements(), padding: 40 }, duration: 400 });
    }
  };

  const handleReset = () => {
    if (cyRef.current) {
      cyRef.current.elements().removeClass('highlighted edge-highlighted dimmed');
      cyRef.current.layout({ name: activeLayout, animate: true, padding: 50 } as any).run();
      setSelectedNode(null);
      setSelectedEdge(null);
    }
  };

  const toggleType = (type: string) => {
    setVisibleTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  if (!activeCase) {
    return (
      <EmptyState
        title="No Investigation Selected"
        description="Select an existing investigation case to explore evidence relationships."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Graph Controls Bar */}
      <div className="p-4 rounded-xl bg-[#17171D] border border-[#343440] flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/30">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#F3F4F6] flex items-center gap-2">
              <span>Evidence Intelligence Graph</span>
              <span className="text-xs font-mono font-normal text-[#A1A1AA]">
                [{activeCase.case_number}]
              </span>
            </h1>
            <p className="text-[11px] text-[#A1A1AA]">
              Interactive Cytoscape.js correlation topology with neighborhood exploration.
            </p>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#A1A1AA] absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Find entity or node..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchNode()}
              className="pl-8 pr-3 py-1 text-xs rounded-lg bg-[#202028] border border-[#343440] text-[#F3F4F6] focus:outline-none focus:border-[#A78BFA] w-44"
            />
          </div>

          {/* Layout Selector */}
          <select
            value={activeLayout}
            onChange={(e: any) => setActiveLayout(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-lg bg-[#202028] border border-[#343440] text-[#F3F4F6] focus:outline-none"
          >
            <option value="cose">Force-Directed (CoSE)</option>
            <option value="concentric">Concentric Circles</option>
            <option value="circle">Circular Topology</option>
            <option value="grid">Grid Structure</option>
          </select>

          <button
            onClick={handleFit}
            className="p-1.5 rounded-lg bg-[#202028] border border-[#343440] hover:border-[#67E8F9] text-[#67E8F9] transition"
            title="Fit to Screen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg bg-[#202028] border border-[#343440] hover:border-[#A78BFA] text-[#A78BFA] transition"
            title="Reset Graph Layout"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-2 flex-wrap px-1">
        <span className="text-[11px] uppercase tracking-wider text-[#A1A1AA] font-mono mr-1">
          Entity Filters:
        </span>
        {Object.keys(visibleTypes).map((type) => (
          <button
            key={type}
            onClick={() => toggleType(type)}
            className={`px-2.5 py-0.5 rounded text-[11px] font-mono transition border ${
              visibleTypes[type]
                ? 'bg-[#202028] text-[#F3F4F6] border-[#A78BFA]/50 shadow-sm'
                : 'bg-[#17171D] text-[#A1A1AA]/50 border-[#343440]/50 line-through'
            }`}
          >
            <span
              className="inline-block w-2 h-2 rounded-full mr-1.5"
              style={{ backgroundColor: NODE_COLORS[type] || '#A1A1AA' }}
            />
            {type.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Main Canvas + Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Graph Canvas */}
        <div className="lg:col-span-3 h-[600px] rounded-xl border border-[#343440] bg-[#111116] relative overflow-hidden shadow-2xl">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#111116]/80 z-10">
              <LoadingSkeleton rows={4} />
            </div>
          ) : graphData?.nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <EmptyState
                title="Graph Has No Nodes"
                description="Ingest artifacts and run correlation pipeline to populate the intelligence graph."
              />
            </div>
          ) : (
            <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
          )}

          {/* Canvas Floating Legend */}
          <div className="absolute bottom-3 left-3 bg-[#17171D]/90 backdrop-blur-md p-2 rounded-lg border border-[#343440] text-[10px] text-[#A1A1AA] flex items-center gap-3 font-mono pointer-events-none">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#A78BFA]"></span> Evidence
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#34D399]"></span> IP Address
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#67E8F9]"></span> URL/Domain
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#F87171]"></span> Finding
            </span>
          </div>
        </div>

        {/* Inspector Panel */}
        <div className="h-[600px] rounded-xl border border-[#343440] bg-[#17171D] p-4 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#343440]">
              <h3 className="text-xs font-semibold text-[#F3F4F6] uppercase font-mono tracking-wider">
                Graph Inspector
              </h3>
              <Info className="w-3.5 h-3.5 text-[#A78BFA]" />
            </div>

            {selectedNode ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] text-[#A1A1AA] uppercase font-mono">Entity Type</span>
                  <div className="mt-0.5">
                    <Badge label={selectedNode.type} variant="violet" />
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-[#A1A1AA] uppercase font-mono">Display Value</span>
                  <p className="font-semibold text-[#F3F4F6] mt-0.5 break-all font-mono">
                    {selectedNode.label}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[#202028] border border-[#343440]">
                  <span className="text-[10px] text-[#A1A1AA] uppercase font-mono">Observable Metadata</span>
                  <pre className="font-mono text-[10px] text-[#C4B5FD] mt-1 whitespace-pre-wrap overflow-x-auto max-h-48">
                    {JSON.stringify(selectedNode.data, null, 2)}
                  </pre>
                </div>
              </div>
            ) : selectedEdge ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] text-[#A1A1AA] uppercase font-mono">Relationship Type</span>
                  <div className="mt-0.5">
                    <Badge label={selectedEdge.label} variant="cyan" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-[#202028] border border-[#343440]">
                    <span className="text-[10px] text-[#A1A1AA] font-mono">Derivation:</span>
                    <p className="font-semibold text-[#F3F4F6] mt-0.5">{selectedEdge.derivation_method}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#202028] border border-[#343440]">
                    <span className="text-[10px] text-[#A1A1AA] font-mono">Confidence:</span>
                    <p className="font-semibold text-[#34D399] mt-0.5">
                      {Math.round(selectedEdge.confidence * 100)}%
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#202028] border border-[#343440]">
                  <span className="text-[10px] text-[#A1A1AA] font-mono uppercase">Correlation Rationale:</span>
                  <p className="text-[#F3F4F6] mt-1 text-[11px] leading-relaxed">
                    {selectedEdge.explanation}
                  </p>
                </div>

                {selectedEdge.supporting_evidence && selectedEdge.supporting_evidence.length > 0 && (
                  <div className="p-3 rounded-lg bg-[#202028] border border-[#343440]">
                    <span className="text-[10px] text-[#A1A1AA] font-mono uppercase">Evidence Provenance:</span>
                    <ul className="mt-1 space-y-1 font-mono text-[10px] text-[#A78BFA]">
                      {selectedEdge.supporting_evidence.map((evId, idx) => (
                        <li key={idx} className="truncate">• Evidence ID: {evId}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-[#A1A1AA] text-xs">
                <Share2 className="w-8 h-8 mx-auto mb-2 text-[#343440]" />
                <p>Click on any node or edge to inspect explainable correlation logic and supporting evidence.</p>
              </div>
            )}
          </div>

          {/* Quick neighborhood action */}
          <div className="pt-3 border-t border-[#343440] text-[11px] text-[#A1A1AA] flex items-center justify-between">
            <span>Neighborhood view</span>
            <button
              onClick={handleReset}
              className="text-[#A78BFA] hover:text-[#C4B5FD] font-medium"
            >
              Clear Focus
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
