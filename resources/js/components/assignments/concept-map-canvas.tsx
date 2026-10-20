import React, { useState, useEffect, useRef } from 'react';
import {
    Move,
    Link2,
    Trash,
    PlusCircle,
    Maximize2,
    Minimize2,
    ZoomIn,
    ZoomOut,
    X,
    GitBranch
} from 'lucide-react';

export interface ConceptMapNode {
    id: string;
    text: string;
    x: number;
    y: number;
    color?: string;
}

export interface ConceptMapEdge {
    id: string;
    from: string;
    to: string;
    label: string;
}

export interface ConceptMapData {
    nodes: ConceptMapNode[];
    edges: ConceptMapEdge[];
}

export interface ConceptMapCanvasProps {
    data: ConceptMapData | any;
    setData?: (data: any) => void;
    readOnly?: boolean;
    canvasHeight?: string;
}

export const ConceptMapCanvas: React.FC<ConceptMapCanvasProps> = ({
    data,
    setData,
    readOnly = false,
    canvasHeight,
}) => {
    const canvasRef = useRef<HTMLDivElement>(null);
    const [draggingNode, setDraggingNode] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // --- Node Actions ---
    const addNode = () => {
        if (readOnly || !setData) return;
        const newNode: ConceptMapNode = {
            id: `node_${Date.now()}`,
            text: 'Konsep Baru',
            x: 120 + Math.random() * 300,
            y: 80 + Math.random() * 250,
            color: 'indigo'
        };
        setData({ ...data, nodes: [...(data?.nodes || []), newNode] });
        setSelectedNode(newNode.id);
    };

    const updateNodeText = (id: string, text: string) => {
        if (readOnly || !setData) return;
        setData({ ...data, nodes: (data?.nodes || []).map((n: any) => n.id === id ? { ...n, text } : n) });
    };

    const deleteNode = (id: string) => {
        if (readOnly || !setData) return;
        setSelectedNode(null);
        setData({
            nodes: (data?.nodes || []).filter((n: any) => n.id !== id),
            edges: (data?.edges || []).filter((e: any) => e.from !== id && e.to !== id)
        });
    };

    const updateEdgeLabel = (id: string, label: string) => {
        if (readOnly || !setData) return;
        setData({ ...data, edges: (data?.edges || []).map((e: any) => e.id === id ? { ...e, label } : e) });
    };

    const deleteEdge = (id: string) => {
        if (readOnly || !setData) return;
        setData({ ...data, edges: (data?.edges || []).filter((e: any) => e.id !== id) });
    };

    // --- Connection ---
    const startConnection = (nodeId: string) => {
        if (readOnly) return;
        setConnectingFrom(nodeId);
        setSelectedNode(null);
    };

    const endConnection = (targetId: string) => {
        if (!connectingFrom || connectingFrom === targetId || !setData) {
            setConnectingFrom(null);
            return;
        }
        if ((data?.edges || []).some((e: any) => e.from === connectingFrom && e.to === targetId)) {
            setConnectingFrom(null);
            return;
        }
        const newEdge: ConceptMapEdge = {
            id: `edge_${Date.now()}`,
            from: connectingFrom,
            to: targetId,
            label: 'berhubungan dengan'
        };
        setData({ ...data, edges: [...(data?.edges || []), newEdge] });
        setConnectingFrom(null);
    };

    // --- Drag Handling (mouse) ---
    const hasDraggedRef = useRef(false);

    const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
        if (readOnly || connectingFrom) return;
        e.stopPropagation();
        const node = (data?.nodes || []).find((n: any) => n.id === nodeId);
        if (!node || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        setDragOffset({ x: e.clientX - rect.left - node.x, y: e.clientY - rect.top - node.y });
        setDraggingNode(nodeId);
        hasDraggedRef.current = false;
    };

    useEffect(() => {
        if (!draggingNode || !setData) return;
        const handleMouseMove = (e: MouseEvent) => {
            hasDraggedRef.current = true;
            if (!canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const x = Math.max(90, Math.min(rect.width - 90, e.clientX - rect.left - dragOffset.x));
            const y = Math.max(30, Math.min(rect.height - 80, e.clientY - rect.top - dragOffset.y));
            setData((prev: any) => ({
                ...prev,
                nodes: (prev?.nodes || []).map((n: any) => n.id === draggingNode ? { ...n, x, y } : n)
            }));
        };
        const handleMouseUp = () => setDraggingNode(null);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingNode, dragOffset, setData]);

    // --- Touch Drag Handling ---
    const handleNodeTouchStart = (nodeId: string, e: React.TouchEvent) => {
        if (readOnly || connectingFrom || e.touches.length === 0) return;
        e.stopPropagation();
        const touch = e.touches[0];
        const node = (data?.nodes || []).find((n: any) => n.id === nodeId);
        if (!node || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        setDragOffset({ x: touch.clientX - rect.left - node.x, y: touch.clientY - rect.top - node.y });
        setDraggingNode(nodeId);
        hasDraggedRef.current = false;
    };

    useEffect(() => {
        if (!draggingNode || !canvasRef.current || !setData) return;
        const canvas = canvasRef.current;
        const handleTouchMove = (e: TouchEvent) => {
            e.preventDefault();
            hasDraggedRef.current = true;
            if (e.touches.length === 0) return;
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const x = Math.max(90, Math.min(rect.width - 90, touch.clientX - rect.left - dragOffset.x));
            const y = Math.max(30, Math.min(rect.height - 80, touch.clientY - rect.top - dragOffset.y));
            setData((prev: any) => ({
                ...prev,
                nodes: (prev?.nodes || []).map((n: any) => n.id === draggingNode ? { ...n, x, y } : n)
            }));
        };
        const handleTouchEnd = () => {
            setDraggingNode(null);
            // For touch: if no drag happened, treat as a tap to select
            if (!hasDraggedRef.current && !readOnly) {
                setSelectedNode(draggingNode);
            }
        };
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd);
        return () => {
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
        };
    }, [draggingNode, dragOffset, readOnly, setData]);

    // --- Click canvas background to deselect / cancel ---
    const handleCanvasClick = () => {
        setSelectedNode(null);
        if (connectingFrom) setConnectingFrom(null);
    };

    // --- Node click (fires after mousedown+mouseup without drag) ---
    const handleNodeClick = (nodeId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (hasDraggedRef.current) return; // was a drag, not a click
        if (connectingFrom) {
            endConnection(nodeId);
        } else {
            setSelectedNode(nodeId === selectedNode ? null : nodeId);
        }
    };

    // --- SVG lines for edges ---
    const svgRef = useRef<SVGSVGElement>(null);

    // --- Pan & Zoom for readOnly mode ---
    const [viewZoom, setViewZoom] = useState(1);
    const [viewPan, setViewPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const initialFitDone = useRef(false);

    // Calculate fit-all transform
    const calcFitAll = () => {
        const nodes = data?.nodes || [];
        if (nodes.length === 0) return { zoom: 1, panX: 0, panY: 0 };
        const padding = 120;
        const xs = nodes.map((n: any) => n.x);
        const ys = nodes.map((n: any) => n.y);
        const minX = Math.min(...xs) - padding;
        const minY = Math.min(...ys) - padding;
        const maxX = Math.max(...xs) + padding;
        const maxY = Math.max(...ys) + padding;
        const contentW = maxX - minX;
        const contentH = maxY - minY;
        if (!canvasRef.current) return { zoom: 1, panX: 0, panY: 0 };
        const containerW = canvasRef.current.clientWidth;
        const containerH = canvasRef.current.clientHeight;
        const zoom = Math.min(1, containerW / contentW, containerH / contentH);
        const panX = -minX * zoom + (containerW - contentW * zoom) / 2;
        const panY = -minY * zoom + (containerH - contentH * zoom) / 2;
        return { zoom, panX, panY };
    };

    // Auto-fit on first render for readOnly
    useEffect(() => {
        const nodes = data?.nodes || [];
        if (readOnly && nodes.length > 0 && !initialFitDone.current) {
            const timer = setTimeout(() => {
                const fit = calcFitAll();
                setViewZoom(fit.zoom);
                setViewPan({ x: fit.panX, y: fit.panY });
                initialFitDone.current = true;
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [readOnly, data?.nodes]);

    const handleFitAll = () => {
        const fit = calcFitAll();
        setViewZoom(fit.zoom);
        setViewPan({ x: fit.panX, y: fit.panY });
    };

    const handleZoomIn = () => setViewZoom(z => Math.min(2, z + 0.15));
    const handleZoomOut = () => setViewZoom(z => Math.max(0.2, z - 0.15));

    // Mouse wheel zoom for readOnly
    const handleWheel = (e: React.WheelEvent) => {
        if (!readOnly) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.08 : 0.08;
        setViewZoom(z => Math.min(2, Math.max(0.2, z + delta)));
    };

    // Pan handlers for readOnly
    const handlePanMouseDown = (e: React.MouseEvent) => {
        if (!readOnly) return;
        e.preventDefault();
        setIsPanning(true);
        setPanStart({ x: e.clientX - viewPan.x, y: e.clientY - viewPan.y });
    };

    const handlePanMouseMove = (e: React.MouseEvent) => {
        if (!readOnly || !isPanning) return;
        setViewPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    };

    const handlePanMouseUp = () => setIsPanning(false);

    // Compute transform style for readOnly content
    const viewTransformStyle = readOnly ? {
        transform: `translate(${viewPan.x}px, ${viewPan.y}px) scale(${viewZoom})`,
        transformOrigin: '0 0',
    } : {};

    const [isFullscreen, setIsFullscreen] = useState(false);

    // Escape key to exit fullscreen
    useEffect(() => {
        if (!isFullscreen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsFullscreen(false);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isFullscreen]);

    const defaultHeight = readOnly ? (canvasHeight || 'h-[500px]') : 'h-[600px]';
    const nodes = data?.nodes || [];
    const edges = data?.edges || [];

    return (
        <>
            {/* Fullscreen backdrop */}
            {isFullscreen && (
                <div 
                    className="fixed inset-0 z-[199] bg-slate-950/80 backdrop-blur-sm"
                    onClick={() => setIsFullscreen(false)}
                />
            )}
            <div 
                ref={canvasRef}
                className={`relative w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden select-none group/canvas ${
                    isFullscreen 
                        ? 'fixed inset-4 z-[200] rounded-xl shadow-2xl' 
                        : `${defaultHeight} rounded-xl`
                } ${readOnly ? 'cursor-grab' : ''} ${isPanning ? '!cursor-grabbing' : ''}`}
                onClick={handleCanvasClick}
                onWheel={handleWheel}
                onMouseDown={readOnly ? handlePanMouseDown : undefined}
                onMouseMove={readOnly ? handlePanMouseMove : undefined}
                onMouseUp={readOnly ? handlePanMouseUp : undefined}
                onMouseLeave={readOnly ? handlePanMouseUp : undefined}
                style={{ touchAction: 'none' }}
            >
                {/* Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
                
                {/* Interactive Help Banner — hidden in readOnly */}
                {!readOnly && (
                    <div className="absolute bottom-4 left-4 right-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 z-20 shadow-lg shadow-slate-100 dark:shadow-none animate-in fade-in duration-300" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300"><Move className="h-3.5 w-3.5 text-indigo-500 shrink-0" /> Geser konsep untuk memindahkan</span>
                            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300"><Link2 className="h-3.5 w-3.5 text-amber-500 shrink-0" /> Klik rantai lalu klik konsep lain</span>
                            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300"><Trash className="h-3.5 w-3.5 text-rose-500 shrink-0" /> Klik konsep lalu hapus</span>
                        </div>
                        <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); addNode(); }}
                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-indigo-100 dark:shadow-none hover:scale-105 active:scale-95 transition cursor-pointer"
                        >
                            <PlusCircle className="h-4 w-4" />
                            Tambah Konsep
                        </button>
                    </div>
                )}

                {/* Zoom controls for readOnly */}
                {readOnly && nodes.length > 0 && (
                    <div className="absolute top-4 right-4 z-30 flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                        <button 
                            type="button" 
                            onClick={() => setIsFullscreen(f => !f)} 
                            className="h-8 w-8 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 border border-indigo-500 rounded-lg shadow-md text-white transition-colors cursor-pointer" 
                            title={isFullscreen ? 'Keluar Layar Penuh' : 'Tampilkan Layar Penuh'}
                        >
                            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                        </button>
                        <button type="button" onClick={handleZoomIn} className="h-8 w-8 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-md text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-bold cursor-pointer" title="Zoom In">
                            <ZoomIn className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={handleZoomOut} className="h-8 w-8 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-md text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-bold cursor-pointer" title="Zoom Out">
                            <ZoomOut className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={handleFitAll} className="h-8 w-8 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-md text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer" title="Fit Semua">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></svg>
                        </button>
                        <div className="text-[8px] font-bold text-slate-400 text-center mt-1">{Math.round(viewZoom * 100)}%</div>
                    </div>
                )}
                {/* Fullscreen hint banner */}
                {isFullscreen && (
                    <div className="absolute top-4 left-4 z-30 flex items-center gap-2 bg-indigo-600/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-lg">
                        <Maximize2 className="h-3 w-3" />
                        Layar Penuh — Geser & Scroll untuk navigasi
                    </div>
                )}

                {connectingFrom && (
                    <div className="absolute top-6 left-6 z-20 px-4 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-200 dark:shadow-none animate-pulse">
                        Klik konsep tujuan untuk menghubungkan...
                    </div>
                )}

                {/* Content layer — pan+zoom in readOnly, normal in edit */}
                <div className="absolute inset-0" style={viewTransformStyle}>

                    {/* SVG layer for edges only */}
                    <svg ref={svgRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
                        <defs>
                            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                            </marker>
                        </defs>
                        {edges.map((edge: any) => {
                            const fromNode = nodes.find((n: any) => n.id === edge.from);
                            const toNode = nodes.find((n: any) => n.id === edge.to);
                            if (!fromNode || !toNode) return null;
                            return (
                                <line
                                    key={edge.id}
                                    x1={fromNode.x} y1={fromNode.y}
                                    x2={toNode.x} y2={toNode.y}
                                    stroke="#94a3b8" strokeWidth="2"
                                    markerEnd="url(#arrowhead)"
                                />
                            );
                        })}
                    </svg>

                    {/* Edge labels as HTML */}
                    {edges.map((edge: any) => {
                        const fromNode = nodes.find((n: any) => n.id === edge.from);
                        const toNode = nodes.find((n: any) => n.id === edge.to);
                        if (!fromNode || !toNode) return null;
                        const midX = (fromNode.x + toNode.x) / 2;
                        const midY = (fromNode.y + toNode.y) / 2;
                        return (
                            <div
                                key={edge.id}
                                className="absolute flex items-center gap-1 group/edge"
                                style={{ left: midX - 65, top: midY - 14, zIndex: 5 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <input
                                    value={edge.label}
                                    readOnly={readOnly}
                                    onChange={(e) => updateEdgeLabel(edge.id, e.target.value)}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-[9px] font-bold text-slate-500 dark:text-slate-400 text-center focus:ring-1 focus:ring-indigo-400 outline-none w-[110px] shadow-sm"
                                />
                                {!readOnly && (
                                    <button
                                        type="button"
                                        onClick={() => deleteEdge(edge.id)}
                                        className="opacity-0 group-hover/edge:opacity-100 text-rose-500 hover:text-rose-600 transition-opacity bg-rose-50 dark:bg-rose-950/30 p-1 rounded-md"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        );
                    })}

                    {/* Nodes as HTML divs */}
                    {nodes.map((node: any) => {
                        const isSelected = selectedNode === node.id;
                        const isConnectSource = connectingFrom === node.id;
                        const isConnectTarget = connectingFrom && connectingFrom !== node.id;
                        
                        return (
                            <div
                                key={node.id}
                                className={`absolute flex items-center group/node ${draggingNode === node.id ? 'z-30 scale-105' : 'z-10'} transition-transform`}
                                style={{
                                    left: node.x - 80,
                                    top: node.y - 22,
                                    cursor: connectingFrom ? 'pointer' : 'grab',
                                    userSelect: 'none',
                                }}
                                onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                                onTouchStart={(e) => handleNodeTouchStart(node.id, e)}
                                onClick={(e) => handleNodeClick(node.id, e)}
                            >
                                {/* Node pill */}
                                <div
                                    className={`
                                        relative flex items-center justify-center px-4 py-2 rounded-full border-2 shadow-md transition-all duration-200 min-w-[140px] max-w-[200px]
                                        ${isConnectSource 
                                            ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-500 shadow-amber-100' 
                                            : isConnectTarget 
                                                ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-400 hover:border-indigo-600 hover:shadow-indigo-200 shadow-indigo-50' 
                                                : isSelected 
                                                    ? 'bg-white dark:bg-slate-900 border-indigo-600 shadow-indigo-200 dark:shadow-indigo-950/30'
                                                    : 'bg-white dark:bg-slate-900 border-indigo-400/60 hover:border-indigo-500'
                                        }
                                    `}
                                >
                                    <input
                                        value={node.text}
                                        readOnly={readOnly || !!connectingFrom}
                                        onChange={(e) => updateNodeText(node.id, e.target.value)}
                                        onClick={(e) => { if (!connectingFrom) e.stopPropagation(); }}
                                        onMouseDown={(e) => { if (!connectingFrom) e.stopPropagation(); }}
                                        onTouchStart={(e) => { if (!connectingFrom) e.stopPropagation(); }}
                                        className="bg-transparent border-none p-0 text-[11px] font-bold text-slate-800 dark:text-slate-100 text-center focus:ring-0 outline-none w-full min-w-0 cursor-text"
                                        style={{ pointerEvents: connectingFrom ? 'none' : 'auto' }}
                                    />
                                </div>

                                {/* Action buttons — only visible when selected & not in connection mode */}
                                {!readOnly && isSelected && !connectingFrom && (
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-200 z-40"
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => startConnection(node.id)}
                                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors cursor-pointer"
                                            title="Hubungkan ke konsep lain"
                                        >
                                            <Link2 className="h-3 w-3" />
                                            Hubungkan
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => deleteNode(node.id)}
                                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                                            title="Hapus konsep"
                                        >
                                            <Trash className="h-3 w-3" />
                                            Hapus
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>{/* end auto-fit wrapper */}
                
                {nodes.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <div className="h-16 w-16 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-350 dark:text-slate-700 mb-4">
                            <GitBranch className="h-8 w-8" />
                        </div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">Kanvas Peta Konsep Kosong</p>
                        <p className="text-[9px] text-slate-300 font-bold mt-1">Klik tombol 'Tambah Konsep' untuk memulai</p>
                    </div>
                )}
            </div>
        </>
    );
};

export default ConceptMapCanvas;
