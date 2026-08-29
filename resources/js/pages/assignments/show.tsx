import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { 
    Calendar, 
    ChevronLeft, 
    Download, 
    ExternalLink, 
    FileText, 
    MessageSquare, 
    MoreHorizontal, 
    Plus, 
    Star, 
    Trash2, 
    User,
    CheckCircle2,
    Clock,
    Activity,
    Info,
    AlertCircle,
    X,
    Eye,
    Save,
    Upload,
    Zap,
    ListChecks,
    Heart,
    UserCheck,
    BookOpen,
    Users,
    MessageCircle,
    PenTool,
    Layers,
    CheckSquare,
    Square,
    Mic,
    FolderKanban,
    Briefcase,
    Camera,
    GitBranch,
    ChevronUp,
    ChevronDown,
    FolderOpen,
    ImageIcon,
    Ticket,
    RotateCcw,
    Maximize2,
    Minimize2,
    ZoomIn,
    ZoomOut,
    ClipboardCheck,
    Target
} from 'lucide-react';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { KktpModal } from '@/components/assignments/KktpModal';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    AssessmentDetailHeader,
    AssessmentInstructions,
    AssessmentDetailTeacherOverview,
    TeacherGradingWorkspace,
} from '@/components/assignments';


interface Submission {
    id: number;
    student_id: number;
    student_name: string;
    content: string | null;
    file_path: string | null;
    score: number | null;
    feedback: string | null;
    is_passed?: boolean;
    attempts?: number;
    content_type?: string | null;
    original_filename?: string | null;
    submitted_at: string;
    remedial_history?: { attempt: number; score: number }[];
    is_remedial_open?: boolean;
}

interface Student {
    id: number;
    name: string;
    nis: string;
    photo_url?: string | null;
}

import { StudentAvatar } from '@/components/student-avatar';

import CommentSection from '@/components/CommentSection';
import ReflectionForm from '@/components/ReflectionForm';
import { PlusCircle, Link2, Move, Type, Trash } from 'lucide-react';

const ConceptMapCanvas = ({ data, setData, readOnly = false, canvasHeight }: { data: any, setData?: any, readOnly?: boolean, canvasHeight?: string }) => {
    const canvasRef = React.useRef<HTMLDivElement>(null);
    const [draggingNode, setDraggingNode] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // --- Node Actions ---
    const addNode = () => {
        if (readOnly) return;
        const newNode = {
            id: `node_${Date.now()}`,
            text: 'Konsep Baru',
            x: 120 + Math.random() * 300,
            y: 80 + Math.random() * 250,
            color: 'indigo'
        };
        setData({ ...data, nodes: [...data.nodes, newNode] });
        setSelectedNode(newNode.id);
    };

    const updateNodeText = (id: string, text: string) => {
        if (readOnly) return;
        setData({ ...data, nodes: data.nodes.map((n: any) => n.id === id ? { ...n, text } : n) });
    };

    const deleteNode = (id: string) => {
        if (readOnly) return;
        setSelectedNode(null);
        setData({
            nodes: data.nodes.filter((n: any) => n.id !== id),
            edges: data.edges.filter((e: any) => e.from !== id && e.to !== id)
        });
    };

    const updateEdgeLabel = (id: string, label: string) => {
        if (readOnly) return;
        setData({ ...data, edges: data.edges.map((e: any) => e.id === id ? { ...e, label } : e) });
    };

    const deleteEdge = (id: string) => {
        if (readOnly) return;
        setData({ ...data, edges: data.edges.filter((e: any) => e.id !== id) });
    };

    // --- Connection ---
    const startConnection = (nodeId: string) => {
        if (readOnly) return;
        setConnectingFrom(nodeId);
        setSelectedNode(null);
    };

    const endConnection = (targetId: string) => {
        if (!connectingFrom || connectingFrom === targetId) {
            setConnectingFrom(null);
            return;
        }
        if (data.edges.some((e: any) => e.from === connectingFrom && e.to === targetId)) {
            setConnectingFrom(null);
            return;
        }
        const newEdge = {
            id: `edge_${Date.now()}`,
            from: connectingFrom,
            to: targetId,
            label: 'berhubungan dengan'
        };
        setData({ ...data, edges: [...data.edges, newEdge] });
        setConnectingFrom(null);
    };

    // --- Drag Handling (mouse) ---
    const hasDraggedRef = useRef(false);

    const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
        if (readOnly || connectingFrom) return;
        e.stopPropagation();
        const node = data.nodes.find((n: any) => n.id === nodeId);
        if (!node || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        setDragOffset({ x: e.clientX - rect.left - node.x, y: e.clientY - rect.top - node.y });
        setDraggingNode(nodeId);
        hasDraggedRef.current = false;
    };

    useEffect(() => {
        if (!draggingNode) return;
        const handleMouseMove = (e: MouseEvent) => {
            hasDraggedRef.current = true;
            if (!canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const x = Math.max(90, Math.min(rect.width - 90, e.clientX - rect.left - dragOffset.x));
            const y = Math.max(30, Math.min(rect.height - 80, e.clientY - rect.top - dragOffset.y));
            setData((prev: any) => ({
                ...prev,
                nodes: prev.nodes.map((n: any) => n.id === draggingNode ? { ...n, x, y } : n)
            }));
        };
        const handleMouseUp = () => setDraggingNode(null);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingNode, dragOffset]);

    // --- Touch Drag Handling ---
    const handleNodeTouchStart = (nodeId: string, e: React.TouchEvent) => {
        if (readOnly || connectingFrom || e.touches.length === 0) return;
        e.stopPropagation();
        const touch = e.touches[0];
        const node = data.nodes.find((n: any) => n.id === nodeId);
        if (!node || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        setDragOffset({ x: touch.clientX - rect.left - node.x, y: touch.clientY - rect.top - node.y });
        setDraggingNode(nodeId);
        hasDraggedRef.current = false;
    };

    useEffect(() => {
        if (!draggingNode || !canvasRef.current) return;
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
                nodes: prev.nodes.map((n: any) => n.id === draggingNode ? { ...n, x, y } : n)
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
    }, [draggingNode, dragOffset]);

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
    const svgRef = React.useRef<SVGSVGElement>(null);

    // --- Pan & Zoom for readOnly mode ---
    const [viewZoom, setViewZoom] = useState(1);
    const [viewPan, setViewPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const initialFitDone = useRef(false);

    // Calculate fit-all transform
    const calcFitAll = () => {
        if (data.nodes.length === 0) return { zoom: 1, panX: 0, panY: 0 };
        const padding = 120;
        const xs = data.nodes.map((n: any) => n.x);
        const ys = data.nodes.map((n: any) => n.y);
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
        if (readOnly && data.nodes.length > 0 && !initialFitDone.current) {
            // Small delay to ensure container has rendered
            const timer = setTimeout(() => {
                const fit = calcFitAll();
                setViewZoom(fit.zoom);
                setViewPan({ x: fit.panX, y: fit.panY });
                initialFitDone.current = true;
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [readOnly, data.nodes]);

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
            {readOnly && data.nodes.length > 0 && (
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
                {data.edges.map((edge: any) => {
                    const fromNode = data.nodes.find((n: any) => n.id === edge.from);
                    const toNode = data.nodes.find((n: any) => n.id === edge.to);
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
            {data.edges.map((edge: any) => {
                const fromNode = data.nodes.find((n: any) => n.id === edge.from);
                const toNode = data.nodes.find((n: any) => n.id === edge.to);
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
            {data.nodes.map((node: any) => {
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
            
            {data.nodes.length === 0 && (
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

const scoringToolLabels: Record<string, string> = {
    rubric: 'Rubrik',
    rating_scale: 'Skala Penilaian',
    checklist: 'Checklist',
    anecdotal_notes: 'Catatan Anekdotal',
};

interface ShowAssignmentProps {
    assignment: any;
    students: Student[];
    my_submission: any;
    my_reflection: any;
    comments: any[];
    user_role: string;
    auth_id: number;
    available_peers?: Student[];
    selected_class_id?: number | 'all';
    assigned_classes?: { id: number; name: string; students_count?: number }[];
}

export default function ShowAssignment({
    assignment,
    students,
    my_submission,
    my_reflection,
    comments,
    user_role,
    auth_id,
    available_peers = [],
    selected_class_id,
    assigned_classes = [],
}: ShowAssignmentProps) {
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [isRetryActive, setIsRetryActive] = useState(false);
    const isSummativeLocked = assignment.assessment_type === 'summative' && my_submission && !my_submission.is_remedial_open;
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [emojiFilter, setEmojiFilter] = useState<'all' | 'paham' | 'ragu' | 'bingung'>('all');
    const [conceptRubric, setConceptRubric] = useState({
        koneksi: false,
        kataHubung: false,
        kelengkapan: false
    });

    const handleGenerateDescriptiveFeedback = (rubricState: typeof conceptRubric) => {
        const { koneksi, kataHubung, kelengkapan } = rubricState;
        if (koneksi && kataHubung && kelengkapan) {
            return "Peta konsepmu sangat luar biasa! Hubungan antar konsep tergambar dengan logis, kata sambung di atas garis panah sudah tepat makna, dan semua materi penting disajikan dengan lengkap. Pertahankan kemampuan berpikir terstrukturmu!";
        }
        
        let intro = "Peta konsepmu sudah mulai berkembang secara visual. Untuk menyempurnakan pemahaman konseptualmu, ada beberapa hal yang perlu ditingkatkan:\n";
        let points = "";
        if (!koneksi) {
            points += "- Koneksi Antar Konsep: Pastikan hubungan logis antar kata kunci sudah tepat dan tidak terbalik.\n";
        }
        if (!kataHubung) {
            points += "- Ketepatan Kata Hubung: Kata sambung di atas garis panah harus menggambarkan relasi antar konsep secara akurat.\n";
        }
        if (!kelengkapan) {
            points += "- Kelengkapan Materi: Lengkapi beberapa kata kunci penting atau materi esensial yang masih terlewatkan.\n";
        }
        
        return intro + points + "\nSilakan ulas kembali materi terkait untuk penguasaan konsep yang lebih mendalam!";
    };

    const handleRubricCheckboxChange = (field: 'koneksi' | 'kataHubung' | 'kelengkapan', checked: boolean) => {
        const nextState = { ...conceptRubric, [field]: checked };
        setConceptRubric(nextState);
        const feedbackString = handleGenerateDescriptiveFeedback(nextState);
        // Auto-calculate score: each of 3 criteria = 1/3 of max_points
        const checkedCount = [nextState.koneksi, nextState.kataHubung, nextState.kelengkapan].filter(Boolean).length;
        const autoScore = Math.round((checkedCount / 3) * (assignment.max_points || 100));
        teacherForm.setData({
            ...teacherForm.data,
            feedback: feedbackString,
            score: autoScore,
        });
    };

    const [journalCheckedIndicators, setJournalCheckedIndicators] = useState<Record<number, boolean>>({});
    const [journalSelectedLevel, setJournalSelectedLevel] = useState<string>('');

    const handleJournalCheckboxChange = (idx: number, isChecked: boolean) => {
        const updatedIndicators = { ...journalCheckedIndicators, [idx]: isChecked };
        setJournalCheckedIndicators(updatedIndicators);

        try {
            const parsed = JSON.parse(teacherForm.data.content || '{}');
            const grading = parsed.grading || {};
            
            const checkedArray = Object.keys(updatedIndicators)
                .filter(k => updatedIndicators[Number(k)])
                .map(Number);

            grading.checked_indicators = checkedArray;
            grading.approach = getGradingApproach();

            const items = (
                assignment.instrument_type === 'self_assessment' || 
                assignment.instrument_type === 'peer_assessment' || 
                assignment.instrument_type === 'structured_assignment' ||
                (assignment.instrument_type === 'exit_ticket' && assignment.instrument_config?.assessment_mode === 'checklist')
            )
                ? (assignment.instrument_config?.indicators || [])
                : (assignment.instrument_config?.questions || []);
            const total = items.length;
            const minCriteria = assignment.instrument_config?.kktp?.min_criteria ?? Math.max(1, Math.round(total / 2));
            const checkedCount = checkedArray.length;
            const isPassed = checkedCount >= minCriteria;
            grading.is_passed = isPassed;

            const calculatedScore = total > 0 ? Math.round((checkedCount / total) * 100) : 0;
            
            parsed.grading = grading;
            
            teacherForm.setData({
                ...teacherForm.data,
                score: calculatedScore,
                content: JSON.stringify(parsed)
            });
        } catch(e) {}
    };

    const handleJournalLevelChange = (levelName: string) => {
        setJournalSelectedLevel(levelName);

        try {
            const parsed = JSON.parse(teacherForm.data.content || '{}');
            const grading = parsed.grading || {};
            
            grading.selected_level = levelName;
            grading.approach = getGradingApproach();

            const levels = assignment.instrument_config?.levels || [];
            const selectedLvlObj = levels.find((l: any) => l.name === levelName);
            const passingLvlObj = levels.find((l: any) => l.name === assignment.instrument_config?.kktp?.passing_level);
            
            let isPassed = true;
            if (passingLvlObj) {
                const selectedIdx = levels.findIndex((l: any) => l.name === levelName);
                const passingIdx = levels.findIndex((l: any) => l.name === assignment.instrument_config?.kktp?.passing_level);
                isPassed = selectedIdx >= passingIdx;
            }
            grading.is_passed = isPassed;

            const index = levels.findIndex((l: any) => l.name === levelName);
            const calculatedScore = levels.length > 0 ? Math.round(((index + 1) / levels.length) * 100) : 100;

            parsed.grading = grading;

            teacherForm.setData({
                ...teacherForm.data,
                score: calculatedScore,
                content: JSON.stringify(parsed)
            });
        } catch(e) {}
    };

    const exitTicketStats = useMemo(() => {
        if (assignment.instrument_type !== 'exit_ticket') return null;
        let paham = 0, ragu = 0, bingung = 0;
        const reflections: { student_name: string; emoji: string; text: string }[] = [];
        
        (assignment.submissions || []).forEach((s: any) => {
            try {
                const p = JSON.parse(s.content || '');
                const emoji = p.answers?.emoji;
                const text = p.answers?.reflection || '';
                if (emoji === 'paham') paham++;
                else if (emoji === 'ragu') ragu++;
                else if (emoji === 'bingung') bingung++;
                
                if (emoji || text) {
                    reflections.push({
                        student_name: s.student_name,
                        emoji: emoji || 'ragu',
                        text: text
                    });
                }
            } catch(e) {}
        });
        
        const total = paham + ragu + bingung;
        return { paham, ragu, bingung, total, reflections };
    }, [assignment.submissions, assignment.instrument_type]);

    const formativeDifficultyStats = useMemo(() => {
        if (assignment.instrument_type !== 'formative_quiz') return null;
        const questions = assignment.instrument_config?.questions || [];
        const submissions = assignment.submissions || [];
        const stats: { id: string; num: number; text: string; wrongCount: number; totalCount: number; wrongPct: number }[] = [];
        
        questions.forEach((q: any, idx: number) => {
            const rawCorrectId = q.answer || q.options?.find((o: any) => o.is_correct)?.id || '';
            const correctOptId = String(rawCorrectId).trim().toLowerCase();
            let wrongCount = 0;
            let totalCount = 0;
            
            submissions.forEach((s: any) => {
                try {
                    const p = JSON.parse(s.content || '');
                    const ans = p.answers?.[q.id];
                    if (ans !== undefined && ans !== null && String(ans).trim() !== '') {
                        totalCount++;
                        const isMcq = q.type === 'multiple_choice';
                        const normAns = String(ans).trim().toLowerCase();
                        let isCorrect = false;

                        if (isMcq) {
                            isCorrect = normAns === correctOptId || (correctOptId.length === 1 && normAns.startsWith(correctOptId)) || (normAns.length === 1 && correctOptId.startsWith(normAns));
                        } else if (q.type === 'short_answer') {
                            const correctVal = String(q.correct_answer || q.answer || '').trim().toLowerCase();
                            isCorrect = correctVal ? (normAns === correctVal || normAns.includes(correctVal) || correctVal.includes(normAns)) : normAns.length >= 3;
                        } else if (q.type === 'essay') {
                            // Non-empty student essay responses are not marked wrong automatically
                            isCorrect = normAns.length >= 5;
                        } else {
                            isCorrect = normAns.length > 0;
                        }
                        
                        if (!isCorrect) wrongCount++;
                    }
                } catch(e) {}
            });
            
            if (totalCount > 0) {
                stats.push({
                    id: q.id,
                    num: idx + 1,
                    text: q.question || q.text || `Soal butir ke-${idx + 1}`,
                    wrongCount,
                    totalCount,
                    wrongPct: Math.round((wrongCount / totalCount) * 100)
                });
            }
        });
        
        const hardQuestions = stats.filter(s => s.wrongPct > 50);
        return { stats, hardQuestions };
    }, [assignment.submissions, assignment.instrument_config, assignment.instrument_type]);
    
    // Form for Teacher (Grading & Recording)
    const teacherForm = useForm({
        assignment_id: assignment.id,
        student_id: '',
        score: 0,
        feedback: '',
        content: '',
    });

    const calculateSystemScore = (content: string) => {
        try {
            const parsed = JSON.parse(content || '');
            if (parsed.type === 'written_test' || parsed.type === 'formative_quiz' || parsed.type === 'quiz_response') {
                const questions = assignment.instrument_config?.questions || [];
                const answers = parsed.answers || {};
                let total = 0;
                questions.forEach((q: any) => {
                    const studentAns = answers[q.id];
                    const points = Number(q.points || 0);
                    const isMcq = q.type === 'multiple_choice';
                    const correctOpt = isMcq ? (q.options?.find((o: any) => o.is_correct) || q.options?.find((o: any) => o.id === q.answer)) : null;
                    const isCorrect = isMcq 
                        ? (correctOpt?.id == studentAns) 
                        : (q.type === 'short_answer' && (q.correct_answer || q.answer) && studentAns?.trim().toLowerCase() == (q.correct_answer || q.answer)?.trim().toLowerCase());
                    
                    if (isCorrect) total += points;
                });
                return total;
            }
            return parsed.auto_score ?? 0;
        } catch (e) {
            return 0;
        }
    };

    const checkIsKKTPPassed = (submission: any, asm: any, scoreVal?: number | null): boolean => {
        if (!submission && scoreVal === null) return false;

        let score = scoreVal;
        if (score === undefined || score === null) {
            score = submission && submission.score !== null && submission.score !== undefined ? Number(submission.score) : null;
        }

        let config = asm?.instrument_config;
        if (typeof config === 'string') {
            try { config = JSON.parse(config); } catch (e) {}
        }
        const kktp = config?.kktp;

        let parsed: any = {};
        if (submission?.content && typeof submission.content === 'string') {
            try { parsed = JSON.parse(submission.content); } catch (e) {}
        } else if (submission?.content && typeof submission.content === 'object') {
            parsed = submission.content;
        }

        if (kktp && typeof kktp === 'object') {
            const approach = kktp.approach || '';

            // 1. Approach: score_interval / interval / score
            if (['score_interval', 'interval', 'score'].includes(approach)) {
                const intervals: Array<any> = kktp.intervals || [];
                if (intervals.length > 0 && score !== null && score !== undefined) {
                    const s = Number(score);
                    for (const iv of intervals) {
                        const min = Number(iv.min ?? 0);
                        const max = Number(iv.max ?? 100);
                        if (s >= min && s <= max) {
                            const str = `${iv.status || ''} ${iv.label || ''} ${iv.desc || ''}`.toLowerCase();
                            if ((str.includes('tuntas') || str.includes('sudah') || str.includes('mencapai') || str.includes('pengayaan')) && !str.includes('belum') && !str.includes('hampir') && !str.includes('remedial')) {
                                return true;
                            }
                            if (str.includes('belum') || str.includes('hampir') || str.includes('remedial')) {
                                return false;
                            }
                        }
                    }
                    // Fallback: check if score is >= lowest min among Tuntas intervals
                    const tuntasMins = intervals
                        .filter(iv => {
                            const str = `${iv.status || ''} ${iv.label || ''} ${iv.desc || ''}`.toLowerCase();
                            return (str.includes('tuntas') || str.includes('sudah') || str.includes('mencapai') || str.includes('pengayaan')) && !str.includes('belum') && !str.includes('hampir') && !str.includes('remedial');
                        })
                        .map(iv => Number(iv.min ?? 100));
                    if (tuntasMins.length > 0) {
                        return s >= Math.min(...tuntasMins);
                    }
                }
            }

            // 2. Approach: percentage / checklist / observation
            if (['percentage', 'checklist', 'observation'].includes(approach)) {
                const threshold = Number(kktp.threshold ?? kktp.min_score ?? asm?.passing_grade ?? 75);
                if (score !== null && score !== undefined) {
                    return Number(score) >= threshold;
                }
            }

            // 3. Approach: criteria_description
            if (approach === 'criteria_description') {
                const total = (config?.rubrics?.length || config?.questions?.length || config?.indicators?.length || 0);
                const minCrit = Number(kktp.min_criteria ?? Math.max(1, Math.round(total / 2)));
                if (parsed.grading?.checked_indicators && Array.isArray(parsed.grading.checked_indicators)) {
                    return parsed.grading.checked_indicators.length >= minCrit;
                }
                if (parsed.indicators && Array.isArray(parsed.indicators)) {
                    const checked = parsed.indicators.filter((ind: any) => ind.checked || ind.selected_level).length;
                    return checked >= minCrit;
                }
                if (parsed.grading?.is_passed !== undefined) {
                    return Boolean(parsed.grading.is_passed);
                }
            }

            // 4. Approach: rubric
            if (approach === 'rubric') {
                const levels: Array<any> = config?.levels || [];
                const passingLvlName = kktp.passing_level;
                const passingIdx = levels.findIndex(l => l.name === passingLvlName);
                if (parsed.grading?.selected_level && passingIdx !== -1) {
                    const selIdx = levels.findIndex(l => l.name === parsed.grading.selected_level);
                    return selIdx >= passingIdx;
                }
                if (parsed.grading?.is_passed !== undefined) {
                    return Boolean(parsed.grading.is_passed);
                }
            }
        }

        if (parsed.grading?.is_passed !== undefined) {
            return Boolean(parsed.grading.is_passed);
        }

        const type = parsed.type || asm?.instrument_type;
        if (['self_assessment', 'peer_assessment', 'reflective_journal', 'exit_ticket'].includes(type)) {
            let mode = parsed.assessment_mode;
            if (!mode) {
                if (asm?.scoring_tool === 'checklist') mode = 'checklist';
                else if (['rubric', 'rating_scale'].includes(asm?.scoring_tool)) mode = 'simple_rubric';
            }
            if (mode === 'checklist' && parsed.indicators && Array.isArray(parsed.indicators)) {
                const total = parsed.indicators.length;
                const checkedCount = parsed.indicators.filter((i: any) => i.checked).length;
                const minCriteria = kktp?.min_criteria ?? Math.max(1, Math.round(total / 2));
                return checkedCount >= minCriteria;
            } else if (mode === 'simple_rubric' && parsed.indicators && Array.isArray(parsed.indicators)) {
                const levels = ['Perlu Bimbingan', 'Cukup', 'Baik', 'Sangat Baik'];
                const passingLvl = kktp?.passing_level || 'Baik';
                let passingIdx = levels.indexOf(passingLvl);
                if (passingIdx === -1) passingIdx = 2;
                const passedCount = parsed.indicators.filter((i: any) => {
                    const idx = levels.indexOf(i.selected_level);
                    return idx !== -1 && idx >= passingIdx;
                }).length;
                const minCriteria = kktp?.min_criteria ?? Math.max(1, Math.round(parsed.indicators.length / 2));
                return passedCount >= minCriteria;
            }
        }

        if (score !== null && score !== undefined) {
            const threshold = Number(kktp?.threshold ?? asm?.passing_grade ?? config?.pass_threshold ?? 70);
            return Number(score) >= threshold;
        }

        return submission && submission.is_passed !== undefined ? Boolean(submission.is_passed) : false;
    };

    const getAssessmentMode = (assignment: any) => {
        if (assignment.instrument_config?.assessment_mode) {
            return assignment.instrument_config.assessment_mode;
        }
        if (assignment.scoring_tool === 'checklist') {
            return 'checklist';
        }
        if (assignment.scoring_tool === 'rubric' || assignment.scoring_tool === 'rating_scale') {
            return 'simple_rubric';
        }
        return 'default';
    };

    const getGradingApproach = () => {
        if (assignment.instrument_type === 'reflective_journal' || assignment.instrument_type === 'exit_ticket') {
            return assignment.instrument_config?.kktp?.approach || 'criteria_description';
        }
        if (assignment.scoring_tool === 'checklist') {
            return 'criteria_description';
        }
        if (assignment.scoring_tool === 'rubric' || assignment.scoring_tool === 'rating_scale') {
            return 'rubric';
        }
        return assignment.instrument_config?.kktp?.approach || 'criteria_description';
    };


    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form for Student (Submitting)
    const studentForm = useForm({
        content: my_submission?.content ?? '',
        answers: {} as Record<string, string>,
        file: null as File | null,
        is_offline_submission: (my_submission?.content && my_submission.content.includes('"submitted_offline":true')) ? true : false,
    });

    const [exitTicketData, setExitTicketData] = useState<any>({});

    // Observation State
    const [obsData, setObsData] = useState({
        checklist: {} as Record<string, boolean>,
        note: '',
        action_plan: ''
    });

    // Anecdotal State
    const [anecdotalData, setAnecdotalData] = useState({
        date: new Date().toISOString().split('T')[0],
        time: '',
        location: '',
        context: '',
        event_description: '',
        analysis_followup: ''
    });

    // Self-Assessment State (Student)
    const [selfAssessmentData, setSelfAssessmentData] = useState({
        feeling: '',
        feeling_reason: '',
        effort_scale: 0,
        reflection_notes: ''
    });

    // Self-Assessment Checklist/Rubric State
    const [selfChecklistData, setSelfChecklistData] = useState<{name: string; checked: boolean}[]>([]);
    const [selfRubricData, setSelfRubricData] = useState<{name: string; selected_level: string}[]>([]);

    // Peer-Assessment State (Student)
    const [peerAssessmentData, setPeerAssessmentData] = useState({
        peer_student_id: '',
        peer_name: '',
        rating: 0,
        best_performer: '',
        worst_performer: '',
        obstacles: '',
        future_expectations: ''
    });

    // Peer-Assessment Checklist/Rubric State
    const [peerChecklistData, setPeerChecklistData] = useState<{name: string; checked: boolean}[]>([]);
    const [peerRubricData, setPeerRubricData] = useState<{name: string; selected_level: string}[]>([]);

    // Exit Ticket Checklist/Short Note State
    const [exitChecklistData, setExitChecklistData] = useState<{name: string; checked: boolean}[]>([]);
    const [exitShortNoteData, setExitShortNoteData] = useState<{text: string; answer: string}[]>([]);
    const [exitStandardAnswers, setExitStandardAnswers] = useState<{question: string; answer: string}[]>([]);

    // Formative Quiz Checklist State
    const [quizChecklistData, setQuizChecklistData] = useState<{name: string; checked: boolean}[]>([]);

    // Structured Assignment State
    const [structuredAssignmentData, setStructuredAssignmentData] = useState({ answer_text: '', file: null as File | null });

    // Reflective Journal State
    const [journalAnswers, setJournalAnswers] = useState<{question: string; answer: string}[]>([]);

    // Project State
    const [projectData, setProjectData] = useState({ description: '', process_notes: '', file: null as File | null });

    // Portfolio State
    const [portfolioReflections, setPortfolioReflections] = useState<{question: string; answer: string}[]>([]);
    const [portfolioFile, setPortfolioFile] = useState<File | null>(null);

    // Assignment (Laporan/Studi Kasus) State
    const [assignmentData, setAssignmentData] = useState({ report_text: '', analysis_notes: '', file: null as File | null });

    // Concept Map State (Student)
    const [conceptMapData, setConceptMapData] = useState({
        nodes: [] as any[],
        edges: [] as any[]
    });
    const [conceptMapSubMode, setConceptMapSubMode] = useState<'canvas' | 'upload'>('canvas');

    // Rubric State (Teacher)
    const [rubricData, setRubricData] = useState<Record<string, string>>({});

    // Performance Observation State (Teacher)
    const [performanceObsData, setPerformanceObsData] = useState({
        observations: {} as Record<string, string>,
        notes: ''
    });

    // Oral Test State (Teacher - Live)
    const [oralTestData, setOralTestData] = useState({
        score: 0,
        notes: '',
        question_responses: {} as Record<string, string>,
        kktp_details: {} as Record<string, string>
    });

    // Performance Assessment State (Teacher - Summative)
    const [performanceData, setPerformanceData] = useState({
        scores: {} as Record<string, string>,
        evidence: null as File | null,
        evidence_preview: '',
        notes: ''
    });

    // Project Assessment State (Teacher - Summative)
    const [projectGradingData, setProjectGradingData] = useState({
        scores: {} as Record<string, string>,
        notes: '',
        checklist: {} as Record<string, boolean>
    });

    // Portfolio Assessment State (Teacher - Summative)
    const [portfolioData, setPortfolioData] = useState({
        artifacts: [] as any[],
        reflections: {} as Record<string, string>,
        notes: ''
    });


    const submissionContent = useMemo(() => {
        if (!my_submission?.content) return null;
        try { return JSON.parse(my_submission.content); } catch (e) { return null; }
    }, [my_submission?.content]);

    const displayScore = useMemo(() => {
        if (my_submission?.score !== null && my_submission?.score !== undefined) {
            return my_submission.score;
        }
        const systemScore = calculateSystemScore(my_submission?.content || '');
        if (my_submission) return systemScore;
        return null;
    }, [my_submission, calculateSystemScore]);

    // Initialize Self-Assessment Data from existing submission
    useEffect(() => {
        if (my_submission?.content) {
            try {
                const parsed = JSON.parse(my_submission.content);
                if (parsed.type === 'self_assessment') {
                    if (parsed.assessment_mode === 'checklist') {
                        setSelfChecklistData(parsed.indicators || []);
                    } else if (parsed.assessment_mode === 'simple_rubric') {
                        setSelfRubricData(parsed.indicators || []);
                    } else {
                        setSelfAssessmentData({
                            feeling: parsed.feeling || '',
                            feeling_reason: parsed.feeling_reason || '',
                            effort_scale: parsed.effort_scale || 0,
                            reflection_notes: parsed.reflection_notes || ''
                        });
                    }
                } else if (parsed.type === 'peer_assessment') {
                    if (parsed.assessment_mode === 'checklist') {
                        setPeerChecklistData(parsed.indicators || []);
                    } else if (parsed.assessment_mode === 'simple_rubric') {
                        setPeerRubricData(parsed.indicators || []);
                    } else {
                        setPeerAssessmentData({
                            peer_student_id: parsed.peer_student_id || '',
                            peer_name: parsed.peer_name || '',
                            rating: parsed.rating || 0,
                            best_performer: parsed.best_performer || '',
                            worst_performer: parsed.worst_performer || '',
                            obstacles: parsed.obstacles || '',
                            future_expectations: parsed.future_expectations || ''
                        });
                    }
                } else if (parsed.type === 'exit_ticket') {
                    if (parsed.assessment_mode === 'checklist') {
                        setExitChecklistData(parsed.indicators || []);
                    } else if (parsed.assessment_mode === 'short_note') {
                        setExitShortNoteData(parsed.answers || []);
                    } else {
                        studentForm.setData('answers', parsed.answers || {});
                        if (parsed.answers && Array.isArray(parsed.answers.reflection_answers)) {
                            setExitStandardAnswers(parsed.answers.reflection_answers);
                        }
                    }
                } else if (parsed.type === 'concept_map') {
                    setConceptMapData({
                        nodes: parsed.nodes || [],
                        edges: parsed.edges || []
                    });
                    if (parsed.submission_type) {
                        setConceptMapSubMode(parsed.submission_type);
                    }
                } else if (parsed.type === 'written_test' || parsed.type === 'formative_quiz') {
                    if (parsed.type === 'formative_quiz' && parsed.assessment_mode === 'checklist') {
                        setQuizChecklistData(parsed.indicators || []);
                    } else {
                        studentForm.setData('answers', parsed.answers || {});
                    }
                } else if (parsed.type === 'structured_assignment') {
                    setStructuredAssignmentData({
                        answer_text: parsed.answer_text || '',
                        file: null
                    });
                } else if (parsed.type === 'reflective_journal') {
                    setJournalAnswers(parsed.answers || []);
                } else if (parsed.type === 'project') {
                    setProjectData({
                        description: parsed.description || '',
                        process_notes: parsed.process_notes || '',
                        file: null
                    });
                } else if (parsed.type === 'portfolio') {
                    setPortfolioReflections(parsed.reflections || []);
                } else if (parsed.type === 'assignment') {
                    setAssignmentData({
                        report_text: parsed.report_text || '',
                        analysis_notes: parsed.analysis_notes || '',
                        file: null
                    });
                } else if (parsed.type === 'quiz_response') {
                    studentForm.setData('answers', parsed.answers || {});
                    studentForm.setData('content', parsed.note || '');
                }
            } catch (e) {}
        }
    }, [my_submission, assignment.instrument_type]);

    // Pre-initialize checklist and rubric data for self/peer assessment if no submission yet
    useEffect(() => {
        if (!my_submission?.content) {
            const indicators = assignment.instrument_config?.indicators || [];
            if (indicators.length > 0) {
                if (selfChecklistData.length === 0) {
                    setSelfChecklistData(indicators.map((ind: any) => ({
                        name: ind.name || ind.text || '',
                        checked: false
                    })));
                }
                if (selfRubricData.length === 0) {
                    setSelfRubricData(indicators.map((ind: any) => ({
                        name: ind.name || ind.text || '',
                        selected_level: ''
                    })));
                }
                if (peerChecklistData.length === 0) {
                    setPeerChecklistData(indicators.map((ind: any) => ({
                        name: ind.name || ind.text || '',
                        checked: false
                    })));
                }
                if (peerRubricData.length === 0) {
                    setPeerRubricData(indicators.map((ind: any) => ({
                        name: ind.name || ind.text || '',
                        selected_level: ''
                    })));
                }
                if (assignment.instrument_type === 'exit_ticket' && exitChecklistData.length === 0) {
                    setExitChecklistData(indicators.map((ind: any) => ({
                        name: ind.name || ind.text || '',
                        checked: false
                    })));
                }
            }

            const questions = assignment.instrument_config?.questions || [];
            if (questions.length > 0 && assignment.instrument_type === 'exit_ticket') {
                if (exitShortNoteData.length === 0) {
                    setExitShortNoteData(questions.map((q: any) => ({
                        text: q.text || '',
                        answer: ''
                    })));
                }
                if (exitStandardAnswers.length === 0) {
                    setExitStandardAnswers(questions.map((q: any) => ({
                        question: q.text || '',
                        answer: ''
                    })));
                }
            }
        }
    }, [assignment.instrument_config, my_submission, exitChecklistData.length, exitShortNoteData.length, exitStandardAnswers.length]);


    // Initialize Concept Map nodes with teacher's keywords if not already loaded or submitted
    useEffect(() => {
        if (assignment.instrument_type === 'concept_map' && !my_submission?.content) {
            const keywords = assignment.instrument_config?.keywords || [];
            if (keywords.length > 0 && conceptMapData.nodes.length === 0) {
                // Position keywords in a grid layout
                const initialNodes = keywords.map((keyword: string, idx: number) => {
                    const row = Math.floor(idx / 3);
                    const col = idx % 3;
                    return {
                        id: `node_kw_${idx}_${Date.now()}`,
                        text: keyword,
                        x: 100 + col * 180 + Math.random() * 20,
                        y: 120 + row * 100 + Math.random() * 20,
                        color: 'indigo'
                    };
                });
                setConceptMapData({
                    nodes: initialNodes,
                    edges: []
                });
            }
        }
    }, [assignment.instrument_config, assignment.instrument_type, my_submission]);

    // Enforce submission mode from teacher's configuration
    useEffect(() => {
        if (assignment.instrument_type === 'concept_map') {
            const mode = assignment.instrument_config?.submission_mode;
            if (mode && mode !== 'hybrid') {
                setConceptMapSubMode(mode);
            }
        }
    }, [assignment.instrument_config, assignment.instrument_type]);

    const openGradeModal = (s: Submission) => {
        setSelectedSubmission(s);
        setConceptRubric({
            koneksi: false,
            kataHubung: false,
            kelengkapan: false
        });
        
        if (['reflective_journal', 'self_assessment', 'peer_assessment', 'structured_assignment', 'exit_ticket'].includes(assignment.instrument_type)) {
            let checked: Record<number, boolean> = {};
            let selectedLvl = '';
            if (s.content) {
                try {
                    const parsed = JSON.parse(s.content);
                    if (parsed.grading) {
                        const grading = parsed.grading;
                        if (Array.isArray(grading.checked_indicators)) {
                            grading.checked_indicators.forEach((idx: number) => {
                                checked[idx] = true;
                            });
                        }
                        selectedLvl = grading.selected_level || '';
                    } else {
                        // Pre-fill from student submission content if teacher has not graded yet
                        if (parsed.assessment_mode === 'checklist' && Array.isArray(parsed.indicators)) {
                            parsed.indicators.forEach((ind: any, idx: number) => {
                                if (ind.checked) {
                                    checked[idx] = true;
                                }
                            });
                        } else if (parsed.assessment_mode === 'simple_rubric' && Array.isArray(parsed.indicators)) {
                            const counts: Record<string, number> = {};
                            parsed.indicators.forEach((ind: any) => {
                                if (ind.selected_level) {
                                    counts[ind.selected_level] = (counts[ind.selected_level] || 0) + 1;
                                }
                            });
                            let maxCount = 0;
                            let mostFrequentLevel = '';
                            Object.entries(counts).forEach(([lvl, count]) => {
                                if (count > maxCount) {
                                    maxCount = count;
                                    mostFrequentLevel = lvl;
                                }
                            });
                            selectedLvl = mostFrequentLevel;
                        }
                    }
                } catch(e) {}
            }
            setJournalCheckedIndicators(checked);
            setJournalSelectedLevel(selectedLvl);
        }
        
        const calculatedSystemScore = calculateSystemScore(s.content || '');
        const finalScoreToSet = (s.score !== null && s.score !== undefined) ? s.score : calculatedSystemScore;

        teacherForm.setData({
            assignment_id: assignment.id,
            student_id: s.student_id.toString(),
            score: finalScoreToSet ?? 0,
            feedback: s.feedback ?? '',
            content: s.content ?? '',
        });
    };

    const openOralGrading = (student: any) => {
        const sub = submissionMap[student.id];
        setSelectedStudent(student);
        
        let initialData = {
            score: 0,
            notes: '',
            question_responses: {} as Record<string, string>
        };

        if (sub?.content) {
            try {
                const parsed = JSON.parse(sub.content);
                if (parsed.type === 'oral_test') {
                    initialData = {
                        score: sub.score || 0,
                        notes: sub.feedback || '',
                        question_responses: parsed.question_responses || {},
                        kktp_details: sub.kktp_details || {}
                    };
                }
            } catch(e) {}
        }

        setOralTestData(initialData);
        teacherForm.setData({
            assignment_id: assignment.id,
            student_id: student.id.toString(),
            score: initialData.score,
            feedback: initialData.notes,
            content: ''
        });
    };

    const handleSaveOralTest = () => {
        const content = JSON.stringify({
            type: 'oral_test',
            question_responses: oralTestData.question_responses,
        });

        router.post(route('assignments.grade'), {
            assignment_id: assignment.id,
            student_id: teacherForm.data.student_id,
            score: oralTestData.score,
            feedback: oralTestData.notes,
            content: content,
            kktp_details: oralTestData.kktp_details
        }, {
            preserveScroll: true,
            onSuccess: () => {
                // Keep selected for live flow
            }
        });
    };



    const openPerformanceGrading = (student: any) => {
        const sub = submissionMap[student.id];
        setSelectedStudent(student);
        
        let initialData = {
            scores: {} as Record<string, string>,
            evidence: null,
            evidence_preview: '',
            notes: ''
        };

        if (sub?.content) {
            try {
                const parsed = JSON.parse(sub.content);
                if (parsed.type === 'performance') {
                    initialData = {
                        scores: parsed.scores || {},
                        evidence: null,
                        evidence_preview: parsed.evidence_url || '',
                        notes: sub.feedback || ''
                    };
                }
            } catch(e) {}
        }

        setPerformanceData(initialData);
        teacherForm.setData({
            assignment_id: assignment.id,
            student_id: student.id.toString(),
            score: sub?.score ?? 0,
            feedback: initialData.notes,
            content: sub?.content ?? ''
        });
    };

    const handleSavePerformance = () => {
        const content = JSON.stringify({
            type: 'performance',
            scores: performanceData.scores,
            evidence_url: performanceData.evidence_preview // If not updated
        });

        router.post(route('assignments.grade'), {
            assignment_id: assignment.id,
            student_id: teacherForm.data.student_id,
            score: teacherForm.data.score,
            feedback: performanceData.notes,
            content: content,
            evidence: performanceData.evidence
        }, {
            preserveScroll: true,
            onSuccess: () => setSelectedStudent(null)
        });
    };

    const calculatePerformanceScore = (scores: Record<string, any>, checklist?: Record<string, boolean>) => {
        const config = assignment.instrument_config;
        if (!config) return 0;

        // Checklist-based scoring (project type)
        if (checklist && Object.keys(checklist).length > 0) {
            const checkedCount = Object.keys(checklist).filter(k => checklist[k]).length;
            return Math.round((checkedCount / Object.keys(checklist).length) * assignment.max_points);
        }

        if (config.indicators && config.indicators.length > 0) {
            const checkedCount = config.indicators.filter((ind: any, idx: number) => {
                const key = ind.id || ind.name || ind.text || idx.toString();
                return !!scores[key];
            }).length;
            const final = (checkedCount / config.indicators.length) * assignment.max_points;
            return Math.round(final);
        }

        if (!config?.criteria) return 0;

        let totalScore = 0;
        let totalWeight = 0;

        config.criteria.forEach((c: any) => {
            const levelId = scores[c.id];
            const level = config.levels.find((l: any) => l.id === levelId);
            if (level) {
                const maxLevelScore = Math.max(...config.levels.map((l: any) => l.score));
                totalScore += (level.score / maxLevelScore) * c.weight;
            }
            totalWeight += c.weight;
        });

        const final = totalWeight > 0 ? (totalScore / totalWeight) * assignment.max_points : 0;
        return Math.round(final);
    };

    const openProjectGrading = (student: any) => {
        const sub = submissionMap[student.id];
        setSelectedStudent(student);
        
        let initialData = {
            scores: {} as Record<string, string>,
            notes: '',
            checklist: {} as Record<string, boolean>
        };

        if (sub?.content) {
            try {
                const parsed = JSON.parse(sub.content);
                if (parsed.type === 'project') {
                    initialData = {
                        scores: parsed.scores || {},
                        checklist: parsed.checklist || {},
                        notes: sub.feedback || ''
                    };
                }
            } catch(e) {}
        }

        setProjectGradingData(initialData);
        const score = calculatePerformanceScore(initialData.scores, initialData.checklist);
        teacherForm.setData({
            assignment_id: assignment.id,
            student_id: student.id.toString(),
            score: sub?.score ?? score,
            feedback: initialData.notes,
            content: sub?.content ?? ''
        });
    };

    const handleSaveProject = () => {
        const content = JSON.stringify({
            type: 'project',
            scores: projectGradingData.scores,
            checklist: projectGradingData.checklist
        });

        router.post(route('assignments.grade'), {
            assignment_id: assignment.id,
            student_id: teacherForm.data.student_id,
            score: teacherForm.data.score,
            feedback: projectGradingData.notes,
            content: content
        }, {
            preserveScroll: true,
            onSuccess: () => setSelectedStudent(null)
        });
    };

    const openPortfolioGrading = (student: any) => {
        const sub = submissionMap[student.id];
        setSelectedStudent(student);
        
        let initialData = {
            artifacts: [] as any[],
            reflections: {} as Record<string, string>,
            notes: ''
        };

        if (sub?.content) {
            try {
                const parsed = JSON.parse(sub.content);
                if (parsed.type === 'portfolio') {
                    let reflections: Record<string, string> = {};
                    if (Array.isArray(parsed.reflections)) {
                        parsed.reflections.forEach((r: any, idx: number) => {
                            reflections[idx] = r.answer || '';
                        });
                    } else {
                        reflections = parsed.reflections || {};
                    }
                    initialData = {
                        artifacts: parsed.artifacts || [],
                        reflections: reflections,
                        notes: sub.feedback || ''
                    };
                }
            } catch(e) {}
        }

        setPortfolioData(initialData);
        teacherForm.setData({
            assignment_id: assignment.id,
            student_id: student.id.toString(),
            score: sub?.score ?? 0,
            feedback: initialData.notes,
            content: sub?.content ?? ''
        });
    };

    const handleSavePortfolio = () => {
        const content = JSON.stringify({
            type: 'portfolio',
            artifacts: portfolioData.artifacts,
            reflections: portfolioData.reflections
        });

        router.post(route('assignments.grade'), {
            assignment_id: assignment.id,
            student_id: teacherForm.data.student_id,
            score: teacherForm.data.score,
            feedback: portfolioData.notes,
            content: content
        }, {
            preserveScroll: true,
            onSuccess: () => setSelectedStudent(null)
        });
    };

    const openObservationModal = (student: Student, existingSubmission?: Submission) => {
        setSelectedStudent(student);
        let checklist = {};
        let note = '';
        let action_plan = '';
        const score = 0;
        const feedback = '';

        if (existingSubmission?.content) {
            try {
                const parsed = JSON.parse(existingSubmission.content);
                if (parsed.type === 'observation') {
                    checklist = parsed.checklist || {};
                    note = parsed.note || '';
                    action_plan = parsed.action_plan || '';
                } else if (parsed.type === 'performance_observation') {
                    setPerformanceObsData({
                        observations: parsed.observations || {},
                        notes: parsed.notes || ''
                    });
                }
            } catch (e) {}
        }

        if (assignment.instrument_type === 'performance_observation' && !existingSubmission) {
            setPerformanceObsData({ observations: {}, notes: '' });
        }

        setObsData({ checklist, note, action_plan });
        teacherForm.setData({
            assignment_id: assignment.id,
            student_id: student.id.toString(),
            score: existingSubmission?.score ?? 0,
            feedback: existingSubmission?.feedback ?? '',
            content: existingSubmission?.content ?? '',
        });
    };

    const openAnecdotalModal = (student: Student, existingSubmission?: Submission) => {
        setSelectedStudent(student);
        let date = new Date().toISOString().split('T')[0];
        let time = '';
        let location = '';
        let context = '';
        let event_description = '';
        let analysis_followup = '';

        if (existingSubmission?.content) {
            try {
                const parsed = JSON.parse(existingSubmission.content);
                if (parsed.type === 'anecdotal') {
                    date = parsed.date || date;
                    time = parsed.time || '';
                    location = parsed.location || '';
                    context = parsed.context || '';
                    event_description = parsed.event_description || '';
                    analysis_followup = parsed.analysis_followup || '';
                }
            } catch (e) {}
        }

        setAnecdotalData({ date, time, location, context, event_description, analysis_followup });
        teacherForm.setData({
            assignment_id: assignment.id,
            student_id: student.id.toString(),
            score: 0,
            feedback: '',
            content: existingSubmission?.content ?? '',
        });
    };

    const openRubricModal = (student: Student, existingSubmission?: Submission) => {
        setSelectedStudent(student);
        let scores = {};
        if (existingSubmission?.content) {
            try {
                const parsed = JSON.parse(existingSubmission.content);
                if (parsed.type === 'rubric') {
                    scores = parsed.scores || {};
                }
            } catch (e) {}
        }
        setRubricData(scores);
        teacherForm.setData({
            assignment_id: assignment.id,
            student_id: student.id.toString(),
            score: existingSubmission?.score ?? 0,
            feedback: existingSubmission?.feedback ?? '',
            content: existingSubmission?.content ?? '',
        });
    };

    const handleGrade = (e: React.FormEvent) => {
        e.preventDefault();
        teacherForm.post(route('assignments.grade'), {
            onSuccess: () => {
                setSelectedSubmission(null);
                setSelectedStudent(null);
                teacherForm.reset();
            },
        });
    };
    const handleSaveObservation = () => {
        const content = JSON.stringify({
            type: 'observation',
            checklist: obsData.checklist,
            note: obsData.note,
            action_plan: obsData.action_plan
        });

        const total = (assignment.instrument_config?.indicators || []).length;
        const munculCount = Object.values(obsData.checklist).filter(v => v === true).length;
        const score = total > 0 ? Math.round((munculCount / total) * 100) : 0;

        router.post(route('assignments.grade'), {
            assignment_id: assignment.id,
            student_id: teacherForm.data.student_id,
            score: score,
            feedback: teacherForm.data.feedback,
            content: content
        }, {
            onSuccess: () => {
                setSelectedStudent(null);
                teacherForm.reset();
            }
        });
    };

    const handleSaveAnecdotal = () => {
        const content = JSON.stringify({
            type: 'anecdotal',
            ...anecdotalData
        });
        
        router.post(route('assignments.grade'), {
            assignment_id: assignment.id,
            student_id: teacherForm.data.student_id,
            score: 0,
            feedback: anecdotalData.analysis_followup,
            content: content
        }, {
            onSuccess: () => {
                setSelectedStudent(null);
                teacherForm.reset();
            }
        });
    };

    const handleSaveRubric = () => {
        const content = JSON.stringify({
            type: 'rubric',
            scores: rubricData
        });

        router.post(route('assignments.grade'), {
            assignment_id: assignment.id,
            student_id: teacherForm.data.student_id,
            score: 0,
            feedback: teacherForm.data.feedback,
            content: content
        }, {
            onSuccess: () => {
                setSelectedStudent(null);
                teacherForm.reset();
            }
        });
    };

    const handleSavePerformanceObservation = () => {
        const content = JSON.stringify({
            type: 'performance_observation',
            observations: performanceObsData.observations,
            notes: performanceObsData.notes
        });

        const total = (assignment.instrument_config?.indicators || []).length;
        const checkedCount = Object.values(performanceObsData.observations).filter(Boolean).length;
        const averageScore = total > 0 ? Math.round((checkedCount / total) * 100) : 0;

        router.post(route('assignments.grade'), {
            assignment_id: assignment.id,
            student_id: teacherForm.data.student_id,
            score: averageScore,
            feedback: performanceObsData.notes,
            content: content
        }, {
            onSuccess: () => {
                setSelectedStudent(null);
                teacherForm.reset();
            }
        });
    };

    const handleSubmitAssignment = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        let finalContent = studentForm.data.content;
        let fileToSubmit = studentForm.data.file;
        let finalScore = null;

        if (assignment.instrument_type === 'quiz_survey' && Object.keys(studentForm.data.answers).length > 0) {
            const questions = assignment.instrument_config?.questions || [];
            let totalScore = 0;
            let canAutoGrade = true;

            questions.forEach((q: any) => {
                const studentAns = studentForm.data.answers[q.id];
                const points = Number(q.points || 0);
                if (q.type === 'multiple_choice') {
                    const rawCorrectId = q.answer || q.options?.find((o: any) => o.is_correct)?.id || '';
                    const correctOptId = String(rawCorrectId).trim().toLowerCase();
                    const normAns = String(studentAns ?? '').trim().toLowerCase();
                    if (correctOptId && (normAns === correctOptId || (correctOptId.startsWith(normAns) && normAns.length === 1))) totalScore += points;
                    if (!correctOptId) canAutoGrade = false;
                } else if (q.type === 'short_answer') {
                    const correctAns = q.correct_answer || q.answer;
                    if (correctAns && String(studentAns ?? '').trim().toLowerCase() == String(correctAns).trim().toLowerCase()) {
                        totalScore += points;
                    }
                    if (!correctAns) canAutoGrade = false;
                } else {
                    canAutoGrade = false;
                }
            });

            finalContent = JSON.stringify({
                type: 'quiz_response',
                answers: studentForm.data.answers,
                note: studentForm.data.content,
                auto_score: canAutoGrade ? totalScore : null
            });

            if (canAutoGrade) finalScore = totalScore;
        } else if (assignment.instrument_type === 'written_test' || assignment.instrument_type === 'formative_quiz') {
            if (assignment.instrument_type === 'formative_quiz' && (assignment.instrument_config?.assessment_mode || 'rubrik') === 'checklist') {
                finalContent = JSON.stringify({ type: 'formative_quiz', assessment_mode: 'checklist', indicators: quizChecklistData });
            } else {
                const questions = assignment.instrument_config?.questions || [];
                let totalScore = 0;
                let maxQuestionsScore = 0;

                questions.forEach((q: any) => {
                    const studentAns = studentForm.data.answers[q.id];
                    const points = Number(q.points || 20);
                    maxQuestionsScore += points;

                    if (q.type === 'multiple_choice') {
                        const rawCorrectId = q.answer || q.options?.find((o: any) => o.is_correct)?.id || '';
                        const correctOptId = String(rawCorrectId).trim().toLowerCase();
                        const normAns = String(studentAns ?? '').trim().toLowerCase();
                        if (correctOptId && (normAns === correctOptId || (correctOptId.startsWith(normAns) && normAns.length === 1))) {
                            totalScore += points;
                        }
                    } else if (q.type === 'short_answer') {
                        const correctAns = q.correct_answer || q.answer;
                        if (correctAns && String(studentAns ?? '').trim().toLowerCase() == String(correctAns).trim().toLowerCase()) {
                            totalScore += points;
                        }
                    } else if (q.type === 'essay') {
                        if (String(studentAns ?? '').trim().length > 0) {
                            totalScore += points;
                        }
                    }
                });

                const scaledScore = maxQuestionsScore > 0 
                    ? Math.round((totalScore / maxQuestionsScore) * (assignment.max_points || 100))
                    : totalScore;

                finalContent = JSON.stringify({
                    type: assignment.instrument_type === 'formative_quiz' ? 'formative_quiz' : 'written_test',
                    answers: studentForm.data.answers,
                    auto_score: scaledScore,
                });

                finalScore = scaledScore;
            }
        } else if (assignment.instrument_type === 'self_assessment') {
            const assessmentMode = getAssessmentMode(assignment);
            if (assessmentMode === 'checklist') {
                finalContent = JSON.stringify({ type: 'self_assessment', assessment_mode: 'checklist', indicators: selfChecklistData });
            } else if (assessmentMode === 'simple_rubric') {
                finalContent = JSON.stringify({ type: 'self_assessment', assessment_mode: 'simple_rubric', indicators: selfRubricData });
            } else {
                finalContent = JSON.stringify({ type: 'self_assessment', ...selfAssessmentData });
            }
        } else if (assignment.instrument_type === 'peer_assessment') {
            const assessmentMode = getAssessmentMode(assignment);
            if (assessmentMode === 'checklist') {
                finalContent = JSON.stringify({ type: 'peer_assessment', assessment_mode: 'checklist', indicators: peerChecklistData, peer_student_id: peerAssessmentData.peer_student_id, peer_name: peerAssessmentData.peer_name });
            } else if (assessmentMode === 'simple_rubric') {
                finalContent = JSON.stringify({ type: 'peer_assessment', assessment_mode: 'simple_rubric', indicators: peerRubricData, peer_student_id: peerAssessmentData.peer_student_id, peer_name: peerAssessmentData.peer_name });
            } else {
                finalContent = JSON.stringify({ type: 'peer_assessment', ...peerAssessmentData });
            }
        } else if (assignment.instrument_type === 'exit_ticket') {
            const assessmentMode = assignment.instrument_config?.assessment_mode || 'default';
            if (assessmentMode === 'checklist') {
                finalContent = JSON.stringify({ type: 'exit_ticket', assessment_mode: 'checklist', indicators: exitChecklistData });
            } else if (assessmentMode === 'short_note') {
                finalContent = JSON.stringify({ type: 'exit_ticket', assessment_mode: 'short_note', answers: exitShortNoteData });
            } else {
                finalContent = JSON.stringify({ 
                    type: 'exit_ticket', 
                    answers: {
                        ...studentForm.data.answers,
                        reflection_answers: exitStandardAnswers
                    }
                });
            }
        } else if (assignment.instrument_type === 'structured_assignment') {
            finalContent = JSON.stringify({ type: 'structured_assignment', answer_text: structuredAssignmentData.answer_text });
            if (structuredAssignmentData.file) {
                fileToSubmit = structuredAssignmentData.file;
            }
        } else if (assignment.instrument_type === 'reflective_journal') {
            finalContent = JSON.stringify({ type: 'reflective_journal', answers: journalAnswers });
        } else if (assignment.instrument_type === 'project') {
            finalContent = JSON.stringify({ type: 'project', description: projectData.description, process_notes: projectData.process_notes });
            if (projectData.file) {
                fileToSubmit = projectData.file;
            }
        } else if (assignment.instrument_type === 'assignment') {
            finalContent = JSON.stringify({ type: 'assignment', report_text: assignmentData.report_text, analysis_notes: assignmentData.analysis_notes });
            if (assignmentData.file) {
                fileToSubmit = assignmentData.file;
            }
        } else if (assignment.instrument_type === 'portfolio') {
            finalContent = JSON.stringify({ type: 'portfolio', reflections: portfolioReflections });
            if (portfolioFile) {
                fileToSubmit = portfolioFile;
            }
        } else if (assignment.instrument_type === 'concept_map') {
            finalContent = JSON.stringify({ 
                type: 'concept_map', 
                submission_type: conceptMapSubMode,
                nodes: conceptMapSubMode === 'canvas' ? conceptMapData.nodes : [], 
                edges: conceptMapSubMode === 'canvas' ? conceptMapData.edges : [] 
            });
        }

        router.post(route('assignments.submit', assignment.id), {
            ...studentForm.data,
            file: fileToSubmit,
            content: finalContent,
            score: finalScore
        }, {
            forceFormData: true,
            onSuccess: () => {
                setSubmitSuccess(true);
                setIsSubmitting(false);
            },
            onError: (errors) => {
                console.error(errors);
                if (errors.content) {
                    setSubmitError(errors.content);
                } else if (errors.file) {
                    setSubmitError(errors.file);
                } else {
                    setSubmitError('Gagal mengirim jawaban. Silakan periksa kembali isian Anda.');
                }
                setIsSubmitting(false);
            },
            onFinish: () => setIsSubmitting(false)
        });
    };

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isKktpModalOpen, setIsKktpModalOpen] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleDelete = () => {
        router.delete(route('assignments.destroy', assignment.id));
    };

    const handleOpenRemedial = (studentId: number) => {
        if (confirm('Buka akses remedial kuis untuk siswa ini? Siswa akan dapat mengerjakan ulang kuis.')) {
            router.post(route('assignments.open_remedial'), {
                assignment_id: assignment.id,
                student_id: studentId
            }, {
                preserveScroll: true
            });
        }
    };

    const submissionMap = useMemo(() => {
        const map: Record<number, Submission> = {};
        assignment.submissions.forEach((s: Submission) => {
            map[s.student_id] = s;
        });
        return map;
    }, [assignment.submissions]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const studentIdParam = params.get('student_id');
        if (studentIdParam && students.length > 0 && user_role === 'teacher') {
            const studentId = parseInt(studentIdParam);
            const student = students.find(s => s.id === studentId);
            if (student) {
                const sub = submissionMap[student.id];
                if (assignment.instrument_type === 'anecdotal_notes') {
                    openAnecdotalModal(student, sub);
                } else if (assignment.instrument_type === 'rubric') {
                    openRubricModal(student, sub);
                } else if (assignment.instrument_type === 'performance') {
                    openPerformanceGrading(student);
                } else if (assignment.instrument_type === 'performance_observation') {
                    openObservationModal(student, sub);
                } else if (assignment.instrument_type === 'guided_discussion') {
                    openObservationModal(student, sub);
                } else if (assignment.instrument_type === 'project') {
                    openProjectGrading(student);
                } else if (assignment.instrument_type === 'portfolio') {
                    openPortfolioGrading(student);
                } else if (assignment.instrument_type === 'oral_test') {
                    openOralGrading(student);
                } else if (assignment.instrument_type === 'observation_checklist') {
                    openObservationModal(student, sub);
                } else {
                    if (sub) {
                        openGradeModal(sub);
                    }
                }
            }
        }
    }, [students, assignment.instrument_type, submissionMap, user_role]);

    return (
        <AppLayout breadcrumbs={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Asesmen', href: '/assignments' },
            { title: assignment.title, href: '#' },
        ]}>
            <Head title={`${assignment.title} – LMS Mokopani`} />

            <>
                <div className="flex h-full flex-1 flex-col gap-6 min-w-0 fade-in max-w-7xl mx-auto w-full">
                {user_role !== 'teacher' && (
                    <>
                        <AssessmentDetailHeader
                            id={assignment.id}
                            title={assignment.title}
                            subjectName={assignment.subject}
                            schoolClasses={assignment.school_classes}
                            dueDate={assignment.due_date}
                            maxPoints={assignment.max_points}
                            passingGrade={assignment.passing_grade}
                            assessmentType={assignment.assessment_type}
                            isTeacher={false}
                            onDelete={handleDelete}
                        />

                        <AssessmentInstructions
                            description={assignment.description}
                            instrumentType={assignment.instrument_type}
                            scoringTool={assignment.scoring_tool}
                            onOpenKktpModal={() => setIsKktpModalOpen(true)}
                        />
                    </>
                )}

                {/* Content based on Role */}
                {user_role === 'teacher' ? (
                    <div className="space-y-6">
                        {/* Analytical Charts for Exit Ticket & Formative Quiz */}
                        {assignment.instrument_type === 'exit_ticket' && (assignment.instrument_config?.assessment_mode || 'default') === 'default' && exitTicketStats && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-500">
                                {/* SVG Donut Chart Card */}
                                <div className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold text-foreground">Distribusi Pemahaman</h3>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Rasio Evaluasi Cepat Refleksi</p>
                                    </div>

                                    <div className="flex items-center justify-center py-6 relative">
                                        {exitTicketStats.total > 0 ? (
                                            <>
                                                <svg width="150" height="150" viewBox="0 0 100 100" className="transform -rotate-90">
                                                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="currentColor" strokeWidth="12" className="text-muted/40" />
                                                    {(() => {
                                                        const total = exitTicketStats.total;
                                                        const circ = 251.2;
                                                        const pahamDash = (exitTicketStats.paham / total) * circ;
                                                        const raguDash = (exitTicketStats.ragu / total) * circ;
                                                        const bingungDash = (exitTicketStats.bingung / total) * circ;
                                                        return (
                                                            <>
                                                                {exitTicketStats.paham > 0 && (
                                                                    <circle 
                                                                        cx="50" cy="50" r="40" 
                                                                        fill="transparent" 
                                                                        stroke="#10B981" 
                                                                        strokeWidth="12" 
                                                                        strokeDasharray={`${pahamDash} ${circ - pahamDash}`} 
                                                                        strokeDashoffset="0" 
                                                                        className="transition-all duration-1000"
                                                                    />
                                                                )}
                                                                {exitTicketStats.ragu > 0 && (
                                                                    <circle 
                                                                        cx="50" cy="50" r="40" 
                                                                        fill="transparent" 
                                                                        stroke="#F59E0B" 
                                                                        strokeWidth="12" 
                                                                        strokeDasharray={`${raguDash} ${circ - raguDash}`} 
                                                                        strokeDashoffset={-pahamDash} 
                                                                        className="transition-all duration-1000"
                                                                    />
                                                                )}
                                                                {exitTicketStats.bingung > 0 && (
                                                                    <circle 
                                                                        cx="50" cy="50" r="40" 
                                                                        fill="transparent" 
                                                                        stroke="#EF4444" 
                                                                        strokeWidth="12" 
                                                                        strokeDasharray={`${bingungDash} ${circ - bingungDash}`} 
                                                                        strokeDashoffset={-(pahamDash + raguDash)} 
                                                                        className="transition-all duration-1000"
                                                                    />
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </svg>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                                    <span className="text-2xl font-black tracking-tight text-foreground">{exitTicketStats.total}</span>
                                                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Respon</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="h-[120px] flex items-center justify-center text-muted-foreground">
                                                <p className="text-[10px] font-semibold uppercase tracking-widest italic">Belum ada respon</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2 border-t border-border pt-4 text-xs">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                                                <span className="font-semibold text-muted-foreground">😊 Paham</span>
                                            </div>
                                            <span className="font-bold text-foreground">{exitTicketStats.paham} siswa ({exitTicketStats.total > 0 ? Math.round((exitTicketStats.paham / exitTicketStats.total) * 100) : 0}%)</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="h-3 w-3 rounded-full bg-amber-500" />
                                                <span className="font-semibold text-muted-foreground">😐 Ragu-Ragu</span>
                                            </div>
                                            <span className="font-bold text-foreground">{exitTicketStats.ragu} siswa ({exitTicketStats.total > 0 ? Math.round((exitTicketStats.ragu / exitTicketStats.total) * 100) : 0}%)</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="h-3 w-3 rounded-full bg-rose-500" />
                                                <span className="font-semibold text-muted-foreground">🙁 Bingung</span>
                                            </div>
                                            <span className="font-bold text-rose-500">{exitTicketStats.bingung} siswa ({exitTicketStats.total > 0 ? Math.round((exitTicketStats.bingung / exitTicketStats.total) * 100) : 0}%)</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Emotional-Qualitative Sorting Dashboard */}
                                <div className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col h-full lg:col-span-2 justify-between">
                                    <div>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 gap-2">
                                            <div>
                                                <h3 className="text-sm font-bold text-foreground">Umpan Balik Kualitatif</h3>
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Pemetaan Emosional Siswa</p>
                                            </div>
                                            <div className="flex gap-1.5 bg-muted/40 p-1 rounded-xl">
                                                {[
                                                    { id: 'all', label: 'Semua', count: exitTicketStats.total },
                                                    { id: 'paham', label: '😊 Paham', count: exitTicketStats.paham },
                                                    { id: 'ragu', label: '😐 Ragu', count: exitTicketStats.ragu },
                                                    { id: 'bingung', label: '🙁 Bingung', count: exitTicketStats.bingung }
                                                ].map((tab) => (
                                                    <button
                                                        key={tab.id}
                                                        type="button"
                                                        onClick={() => setEmojiFilter(tab.id as any)}
                                                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                                            emojiFilter === tab.id 
                                                                ? tab.id === 'bingung'
                                                                    ? 'bg-rose-500 text-white shadow-xs'
                                                                    : 'bg-primary text-white shadow-xs'
                                                                : 'text-muted-foreground hover:text-foreground'
                                                        }`}
                                                    >
                                                        {tab.label} <span className="ml-1 opacity-70">({tab.count})</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-3 overflow-y-auto max-h-[220px] mt-4 pr-2 custom-scrollbar">
                                            {exitTicketStats.reflections
                                                .filter((r) => emojiFilter === 'all' || r.emoji === emojiFilter)
                                                .length > 0 ? (
                                                    exitTicketStats.reflections
                                                        .filter((r) => emojiFilter === 'all' || r.emoji === emojiFilter)
                                                        .map((ref, idx) => (
                                                            <div 
                                                                key={idx} 
                                                                className={`p-3.5 rounded-xl border transition-all ${
                                                                    ref.emoji === 'bingung'
                                                                        ? 'border-rose-500/20 bg-rose-500/5'
                                                                        : ref.emoji === 'ragu'
                                                                            ? 'border-amber-500/20 bg-amber-500/5'
                                                                            : 'border-emerald-500/20 bg-emerald-500/5'
                                                                }`}
                                                            >
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground">{ref.student_name}</span>
                                                                    <span className="text-xs">{ref.emoji === 'paham' ? '😊 Paham' : ref.emoji === 'ragu' ? '😐 Ragu' : '🙁 Bingung'}</span>
                                                                </div>
                                                                <p className="text-xs font-medium text-muted-foreground leading-relaxed italic">
                                                                    "{ref.text || 'Tidak menuliskan umpan balik teks'}"
                                                                </p>
                                                            </div>
                                                        ))
                                                ) : (
                                                    <div className="py-12 flex flex-col items-center justify-center text-center">
                                                        <span className="text-2xl mb-2">🎈</span>
                                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest italic">Tidak ada respon refleksi untuk kategori ini</p>
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Formative Quiz Difficulty Alert (Clean, Mobile-Optimized) */}
                        {assignment.instrument_type === 'formative_quiz' && formativeDifficultyStats && formativeDifficultyStats.hardQuestions.length > 0 && (
                            <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 dark:bg-rose-950/20 p-3.5 sm:p-4 animate-in fade-in duration-300 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="h-6 w-6 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                                            <AlertCircle className="h-3.5 w-3.5" />
                                        </div>
                                        <h4 className="text-xs font-black text-rose-600 dark:text-rose-400 tracking-wide truncate">
                                            Konsep Perlu Penguatan
                                        </h4>
                                    </div>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-600 dark:text-rose-300 shrink-0">
                                        {formativeDifficultyStats.hardQuestions.length} Soal &gt; 50% Salah
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {formativeDifficultyStats.hardQuestions.map((q) => (
                                        <div key={q.id} className="p-3 rounded-lg bg-card/80 border border-border/80 text-left space-y-1.5 shadow-2xs">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[10px] font-black text-rose-600 dark:text-rose-400">
                                                    No. {q.num}
                                                </span>
                                                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                                                    {q.wrongPct}% salah
                                                </span>
                                            </div>
                                            <p className="text-xs text-foreground font-medium line-clamp-2 leading-relaxed">
                                                {q.text}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Modern High-Density Batch Workspace for Grading */}
                        <TeacherGradingWorkspace
                            assignment={assignment}
                            students={students}
                            assignedClasses={assigned_classes}
                            selectedClassId={selected_class_id}
                            onOpenObservationModal={openObservationModal}
                            onOpenAnecdotalModal={openAnecdotalModal}
                            onOpenRubricModal={openRubricModal}
                            onOpenOralGrading={openOralGrading}
                            onOpenPerformanceGrading={openPerformanceGrading}
                            onOpenProjectGrading={openProjectGrading}
                            onOpenPortfolioGrading={openPortfolioGrading}
                            onOpenGradeModal={openGradeModal}
                            onOpenRemedial={handleOpenRemedial}
                        />

                        
                        {/* Diskusi & Catatan Asesmen Kelas */}
                        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs">
                            <h3 className="text-xs sm:text-sm font-black text-foreground uppercase tracking-wider mb-4">
                                Diskusi & Catatan Kelas
                            </h3>
                            <CommentSection 
                                assignmentId={assignment.id} 
                                comments={comments} 
                                authId={auth_id} 
                                userRole={user_role} 
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-12 animate-in fade-in duration-700">
                        <div className="grid gap-8 lg:grid-cols-3">
                        {/* Submission Form / Observation View */}
                        <div className="lg:col-span-2 space-y-4">
                            {['performance_observation', 'observation', 'observation_checklist'].includes(assignment.instrument_type) ? (
                                <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-xs space-y-6 animate-in fade-in duration-500">
                                    <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-border/60">
                                        <div className="flex items-center gap-3">
                                            <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black shrink-0">
                                                <Eye className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                                                    Lembar Hasil Observasi Guru
                                                </h2>
                                                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                                                    Penilaian proses belajar & keaktifan langsung oleh Guru di kelas
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {my_submission?.score !== null && my_submission?.score !== undefined ? (
                                                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-2xs">
                                                    <CheckCircle2 className="h-3.5 w-3.5" /> Sudah Dinilai
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-2xs">
                                                    <Clock className="h-3.5 w-3.5 animate-pulse" /> Menunggu Observasi
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Jika Sudah Dinilai */}
                                    {my_submission?.score !== null && my_submission?.score !== undefined ? (() => {
                                        let parsedContent: any = null;
                                        if (my_submission?.content) {
                                            if (typeof my_submission.content === 'object') {
                                                parsedContent = my_submission.content;
                                            } else if (typeof my_submission.content === 'string') {
                                                try {
                                                    parsedContent = JSON.parse(my_submission.content);
                                                } catch (e) {}
                                            }
                                        }

                                        let teacherFeedback: string | null = null;
                                        if (my_submission?.feedback && my_submission.feedback.trim() !== '') {
                                            teacherFeedback = my_submission.feedback;
                                        } else if (parsedContent) {
                                            if (parsedContent.notes && typeof parsedContent.notes === 'string' && parsedContent.notes.trim() !== '') {
                                                teacherFeedback = parsedContent.notes;
                                            } else if (parsedContent.note && typeof parsedContent.note === 'string' && parsedContent.note.trim() !== '') {
                                                teacherFeedback = parsedContent.note;
                                            } else if (parsedContent.feedback && typeof parsedContent.feedback === 'string' && parsedContent.feedback.trim() !== '') {
                                                teacherFeedback = parsedContent.feedback;
                                            }
                                        } else if (typeof my_submission?.content === 'string' && !my_submission.content.trim().startsWith('{')) {
                                            teacherFeedback = my_submission.content;
                                        }

                                        const kktpData: any = (my_submission?.kktp_details && Object.keys(my_submission.kktp_details).length > 0)
                                            ? my_submission.kktp_details
                                            : (parsedContent?.observations || parsedContent?.checklist || parsedContent?.scores || {});

                                        return (
                                            <div className="space-y-6">
                                                {/* Ringkasan Skor & Level KKTP */}
                                                <div className="grid gap-3 sm:grid-cols-3">
                                                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
                                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Skor Observasi</p>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-2xl sm:text-3xl font-black text-foreground">{my_submission.score}</span>
                                                            <span className="text-xs text-muted-foreground font-bold">/ {assignment.max_points || 100}</span>
                                                        </div>
                                                    </div>

                                                    <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-1">
                                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Kategori Capaian</p>
                                                        <p className="text-sm font-black text-foreground truncate">
                                                            {my_submission.qualitative_score || (
                                                                my_submission.score >= 90 ? 'Sangat Baik' :
                                                                my_submission.score >= 75 ? 'Baik' :
                                                                my_submission.score >= 60 ? 'Cukup' : 'Perlu Bimbingan'
                                                            )}
                                                        </p>
                                                    </div>

                                                    <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-1">
                                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Status KKTP</p>
                                                        <p className={`text-sm font-black ${my_submission.score >= (assignment.passing_grade || 75) ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                            {my_submission.score >= (assignment.passing_grade || 75) ? '✨ Tuntas Target' : '⚠️ Perlu Penguatan'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Umpan Balik Guru */}
                                                {teacherFeedback && (
                                                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-foreground space-y-1.5">
                                                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-black">
                                                            <MessageCircle className="h-4 w-4" />
                                                            <span>Catatan & Umpan Balik Guru</span>
                                                        </div>
                                                        <p className="text-xs leading-relaxed font-medium">
                                                            {teacherFeedback}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Rincian Indikator & Bagian Belum Tuntas */}
                                                <div className="space-y-3 pt-2">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
                                                            Rincian Capaian Indikator Pengamatan
                                                        </h4>
                                                        <span className="text-[10px] text-muted-foreground font-bold">
                                                            {(assignment.instrument_config?.indicators || []).length} Indikator
                                                        </span>
                                                    </div>

                                                    <div className="space-y-2.5">
                                                        {(assignment.instrument_config?.indicators || []).map((ind: any, idx: number) => {
                                                            const indName = typeof ind === 'string' ? ind : (ind.name || `Indikator ${idx + 1}`);
                                                            const indDetail = ind.description || ind.criteria || '';
                                                            
                                                            // Evaluasi data hasil penilaian guru
                                                            const rawVal = kktpData[indName] ?? kktpData[idx] ?? kktpData[idx.toString()] ?? kktpData[`ind_${idx}`];
                                                            const isChecked = rawVal === true || rawVal === 'checked' || rawVal === 1;
                                                            const isStringLevel = typeof rawVal === 'string' ? rawVal : null;
                                                            
                                                            const isNeedsHelp = isStringLevel?.toLowerCase().includes('bimbingan') || isStringLevel?.toLowerCase().includes('cukup') || rawVal === false;
                                                            const isMastered = isChecked || isStringLevel?.toLowerCase().includes('baik') || (my_submission.score >= 75 && !isNeedsHelp);

                                                            return (
                                                                <div 
                                                                    key={idx}
                                                                    className={`p-3.5 rounded-xl border transition flex items-start gap-3 ${
                                                                        isMastered 
                                                                            ? 'bg-emerald-500/5 border-emerald-500/25' 
                                                                            : isNeedsHelp 
                                                                                ? 'bg-rose-500/5 border-rose-500/25'
                                                                                : 'bg-muted/30 border-border'
                                                                    }`}
                                                                >
                                                                    <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                                                                        isMastered ? 'bg-emerald-500/20 text-emerald-600' : isNeedsHelp ? 'bg-rose-500/20 text-rose-600' : 'bg-muted text-muted-foreground'
                                                                    }`}>
                                                                        {isMastered ? <CheckCircle2 className="h-4 w-4" /> : isNeedsHelp ? <AlertCircle className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                                                            <p className="text-xs font-bold text-foreground leading-snug">{indName}</p>
                                                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                                                                isMastered ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : isNeedsHelp ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300' : 'bg-muted text-muted-foreground'
                                                                            }`}>
                                                                                {isStringLevel || (isMastered ? 'Tuntas' : 'Perlu Peningkatan')}
                                                                            </span>
                                                                        </div>
                                                                        {indDetail && (
                                                                            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{indDetail}</p>
                                                                        )}
                                                                        {isNeedsHelp && (
                                                                            <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1">
                                                                                <Info className="h-3 w-3 shrink-0" /> Bagian ini belum tuntas dan perlu pendampingan/latihan lebih lanjut.
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })() : (
                                        /* Jika Belum Dinilai */
                                        <div className="space-y-6 pt-2">
                                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
                                                <div className="p-2 rounded-lg bg-amber-500/15 text-amber-600 shrink-0 mt-0.5">
                                                    <Info className="h-4 w-4" />
                                                </div>
                                                <div className="space-y-1">
                                                    <h4 className="text-xs font-bold text-amber-700 dark:text-amber-300">
                                                        Penilaian Langsung di Kelas
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                                        Penilaian ini dilakukan secara langsung oleh Guru Mapel melalui pengamatan keaktifan dan unjuk kerja di kelas. Anda tidak perlu mengunggah berkas atau formulir jawaban. Nilai dan catatan guru akan otomatis muncul di sini setelah observasi selesai dinilai.
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Panduan Indikator Pengamatan */}
                                            <div className="space-y-3">
                                                <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
                                                    Aspek & Indikator yang Diamati Guru
                                                </h4>
                                                <div className="space-y-2">
                                                    {(assignment.instrument_config?.indicators || []).map((ind: any, idx: number) => {
                                                        const indName = typeof ind === 'string' ? ind : (ind.name || `Indikator ${idx + 1}`);
                                                        const indDetail = ind.description || ind.criteria || '';
                                                        return (
                                                            <div key={idx} className="p-3.5 rounded-xl border border-border bg-muted/20 flex items-start gap-3">
                                                                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                                                                    {idx + 1}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-bold text-foreground leading-snug">{indName}</p>
                                                                    {indDetail && (
                                                                        <p className="text-[11px] text-muted-foreground mt-0.5">{indDetail}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                            <div className="rounded-xl border border-border bg-card p-6 md:p-8 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-black text-foreground tracking-tight uppercase tracking-wider">Kumpulkan Jawaban</h2>
                                    {assignment.assessment_type === 'initial' && (
                                        <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 dark:bg-amber-950/30 text-warning rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-900/30">
                                            <Zap className="h-3 w-3" /> Formatif
                                        </div>
                                    )}
                                </div>

                                {isSummativeLocked && (
                                    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/20 p-5 flex items-start gap-3.5 animate-pulse">
                                        <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                                            <AlertCircle className="h-4 w-4" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">Asesmen Sumatif Terkunci</h3>
                                            <p className="text-xs text-amber-700/95 dark:text-amber-400 leading-relaxed font-medium">
                                                Anda sudah mengumpulkan jawaban untuk evaluasi sumatif ini. Pengunggahan jawaban kembali telah dikunci kecuali guru membuka program remedial untuk Anda.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {assignment.instrument_config?.stimulus && assignment.instrument_type !== 'project' && (
                                    <div className="mb-10 p-8 rounded-xl bg-indigo-50/30 dark:bg-slate-800/50 border border-indigo-100 dark:border-slate-800 space-y-6">
                                        <div className="flex items-center gap-3 text-[10px] font-black text-primary uppercase tracking-widest">
                                            <MessageSquare className="h-4 w-4" />
                                            Stimulus / Studi Kasus
                                        </div>
                                        {assignment.instrument_config.stimulus_image && (
                                            <div className="rounded-xl overflow-hidden border border-border shadow-lg">
                                                <img 
                                                    src={`/storage/${assignment.instrument_config.stimulus_image}`} 
                                                    className="w-full max-h-96 object-cover" 
                                                    alt="Stimulus"
                                                />
                                            </div>
                                        )}
                                        <p className="text-sm text-muted-foreground leading-relaxed italic font-medium">
                                            "{assignment.instrument_config.stimulus}"
                                        </p>
                                    </div>
                                )}

                                <form onSubmit={handleSubmitAssignment} className="space-y-10">
                                    <fieldset disabled={isSummativeLocked} className="space-y-10 m-0 p-0 border-0 min-w-0">
                                    {assignment.instrument_type === 'peer_assessment' ? (
                                        <div className="space-y-10">
                                            {/* Identity Section (Selalu Tampil) */}
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 text-xs font-black flex items-center justify-center shadow-sm border border-indigo-100 dark:border-indigo-900/30">
                                                        <User className="h-4 w-4" />
                                                    </div>
                                                    <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Siapa teman yang Anda nilai?</p>
                                                </div>
                                                <select
                                                    value={peerAssessmentData.peer_student_id}
                                                    onChange={(e) => {
                                                        const selectedId = e.target.value;
                                                        const selectedStudent = available_peers.find(p => p.id === parseInt(selectedId));
                                                        setPeerAssessmentData({
                                                            ...peerAssessmentData,
                                                            peer_student_id: selectedId,
                                                            peer_name: selectedStudent?.name || ''
                                                        });
                                                    }}
                                                    className="w-full rounded-xl border border-slate-100 bg-slate-50/30 px-6 py-4 text-sm font-bold outline-none focus:border-indigo-400 focus:bg-white transition-all shadow-sm dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-200"
                                                >
                                                    <option value="">Pilih teman yang akan dinilai...</option>
                                                    {available_peers.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name} ({p.nis})</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Form Content Berdasarkan Mode */}
                                            {(() => {
                                                const assessmentMode = getAssessmentMode(assignment);
                                                if (assessmentMode === 'checklist') {
                                                    return (
                                                        <div className="space-y-6 animate-in fade-in duration-500 pt-6 border-t border-slate-100 dark:border-slate-800">
                                                            <div className="flex items-center gap-3 mb-6">
                                                                <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary text-xs font-black flex items-center justify-center">
                                                                    <CheckSquare className="h-4 w-4" />
                                                                </div>
                                                                <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Penilaian Antarteman - Mode Ceklis</p>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">Tandai indikator yang menurutmu sudah dicapai oleh rekanmu:</p>
                                                            {(assignment.instrument_config?.indicators || []).map((ind: any, idx: number) => (
                                                                <label key={idx} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer group">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={peerChecklistData[idx]?.checked || false}
                                                                        onChange={() => {
                                                                            const newData = [...peerChecklistData];
                                                                            if (!newData[idx]) newData[idx] = { name: ind.name, checked: false };
                                                                            newData[idx].checked = !newData[idx].checked;
                                                                            setPeerChecklistData(newData);
                                                                        }}
                                                                        className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                                                                    />
                                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{ind.name}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    );
                                                } else if (assessmentMode === 'simple_rubric') {
                                                    return (
                                                        <div className="space-y-6 animate-in fade-in duration-500 pt-6 border-t border-slate-100 dark:border-slate-800">
                                                            <div className="flex items-center gap-3 mb-6">
                                                                <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary text-xs font-black flex items-center justify-center">
                                                                    <Layers className="h-4 w-4" />
                                                                </div>
                                                                <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Penilaian Antarteman - Rubrik Sederhana</p>
                                                            </div>
                                                            {(assignment.instrument_config?.indicators || []).map((ind: any, idx: number) => (
                                                                <div key={idx} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 space-y-3">
                                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{ind.name}</p>
                                                                    <div className="flex gap-2">
                                                                        {['Perlu Bimbingan', 'Cukup', 'Baik', 'Sangat Baik'].map((level, lvlIdx) => (
                                                                            <button
                                                                                key={level}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const newData = [...peerRubricData];
                                                                                    if (!newData[idx]) newData[idx] = { name: ind.name, selected_level: '' };
                                                                                    newData[idx].selected_level = level;
                                                                                    setPeerRubricData(newData);
                                                                                }}
                                                                                className={`flex-1 py-2 px-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border-2 ${
                                                                                    peerRubricData[idx]?.selected_level === level
                                                                                        ? lvlIdx === 0 ? 'bg-red-50 border-red-400 text-red-600'
                                                                                          : lvlIdx === 1 ? 'bg-amber-50 border-amber-400 text-amber-600'
                                                                                          : lvlIdx === 2 ? 'bg-blue-50 border-blue-400 text-blue-600'
                                                                                          : 'bg-emerald-50 border-emerald-400 text-emerald-600'
                                                                                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-muted-foreground hover:border-primary/30'
                                                                                }`}
                                                                            >
                                                                                {level}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                } else {
                                                    return (
                                                        <div className="space-y-10 animate-in fade-in duration-500 pt-6 border-t border-slate-100 dark:border-slate-800">
                                                            {/* Rating Section */}
                                                            <div className="space-y-6">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 text-xs font-black flex items-center justify-center shadow-sm border border-amber-100 dark:border-amber-900/30">
                                                                        <Star className="h-4 w-4" />
                                                                    </div>
                                                                    <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Rating Performa Teman (1-5)</p>
                                                                </div>
                                                                <div className="flex items-center justify-between gap-2">
                                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                                        <button
                                                                            key={star}
                                                                            type="button"
                                                                            onClick={() => setPeerAssessmentData({ ...peerAssessmentData, rating: star })}
                                                                            className={`flex-1 h-14 rounded-xl border-2 flex items-center justify-center text-lg font-black transition-all ${peerAssessmentData.rating >= star ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-100/50' : 'bg-slate-50/50 border-slate-50 text-slate-300 dark:bg-slate-800 dark:border-slate-800 hover:border-amber-200'}`}
                                                                        >
                                                                            {star}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* Questions Section */}
                                                            <div className="space-y-8 pt-10 border-t border-slate-50 dark:border-slate-800">
                                                                <div className="space-y-4">
                                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-4">Siapa teman dengan performa terbaik di kelompokmu?</label>
                                                                    <input 
                                                                        type="text"
                                                                        placeholder="Sebutkan nama teman terbaik..."
                                                                        value={peerAssessmentData.best_performer}
                                                                        onChange={(e) => setPeerAssessmentData({ ...peerAssessmentData, best_performer: e.target.value })}
                                                                        className="w-full rounded-xl border border-slate-100 bg-slate-50/30 px-6 py-4 text-sm font-medium outline-none focus:border-indigo-400 focus:bg-white transition-all dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-200"
                                                                    />
                                                                </div>
                                                                <div className="space-y-4">
                                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-4">Siapa yang kinerjanya paling perlu ditingkatkan?</label>
                                                                    <input 
                                                                        type="text"
                                                                        placeholder="Sebutkan nama teman tersebut..."
                                                                        value={peerAssessmentData.worst_performer}
                                                                        onChange={(e) => setPeerAssessmentData({ ...peerAssessmentData, worst_performer: e.target.value })}
                                                                        className="w-full rounded-xl border border-slate-100 bg-slate-50/30 px-6 py-4 text-sm font-medium outline-none focus:border-indigo-400 focus:bg-white transition-all dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-200"
                                                                    />
                                                                </div>
                                                                <div className="space-y-4">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <AlertCircle className="h-4 w-4 text-rose-500" />
                                                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Apa kendala yang dihadapi kelompok?</label>
                                                                    </div>
                                                                    <textarea 
                                                                        rows={3}
                                                                        placeholder="Cth: Pembagian tugas kurang merata atau komunikasi sulit..."
                                                                        value={peerAssessmentData.obstacles}
                                                                        onChange={(e) => setPeerAssessmentData({ ...peerAssessmentData, obstacles: e.target.value })}
                                                                        className="w-full rounded-xl border border-slate-100 bg-slate-50/30 px-6 py-4 text-sm font-medium outline-none focus:border-indigo-400 focus:bg-white transition-all dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-200"
                                                                    ></textarea>
                                                                </div>
                                                                <div className="space-y-4">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <MessageCircle className="h-4 w-4 text-primary" />
                                                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Apa yang kamu harapkan di pertemuan berikutnya?</label>
                                                                    </div>
                                                                    <textarea 
                                                                        rows={3}
                                                                        placeholder="Cth: Lebih banyak diskusi tatap muka atau pembagian peran yang lebih jelas..."
                                                                        value={peerAssessmentData.future_expectations}
                                                                        onChange={(e) => setPeerAssessmentData({ ...peerAssessmentData, future_expectations: e.target.value })}
                                                                        className="w-full rounded-xl border border-slate-100 bg-slate-50/30 px-6 py-4 text-sm font-medium outline-none focus:border-indigo-400 focus:bg-white transition-all dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-200"
                                                                    ></textarea>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            })()}
                                        </div>
                                    ) : assignment.instrument_type === 'self_assessment' ? (
                                        (() => {
                                            const assessmentMode = getAssessmentMode(assignment);
                                            if (assessmentMode === 'checklist') {
                                                return (
                                                    <div className="space-y-6 animate-in fade-in duration-500">
                                                        <div className="flex items-center gap-3 mb-6">
                                                            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary text-xs font-black flex items-center justify-center">
                                                                <CheckSquare className="h-4 w-4" />
                                                            </div>
                                                            <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Penilaian Diri - Mode Ceklis</p>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">Tandai indikator yang menurutmu sudah kamu capai:</p>
                                                        {(assignment.instrument_config?.indicators || []).map((ind: any, idx: number) => (
                                                            <label key={idx} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer group">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selfChecklistData[idx]?.checked || false}
                                                                    onChange={() => {
                                                                        const newData = [...selfChecklistData];
                                                                        if (!newData[idx]) newData[idx] = { name: ind.name, checked: false };
                                                                        newData[idx].checked = !newData[idx].checked;
                                                                        setSelfChecklistData(newData);
                                                                    }}
                                                                    className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                                                                />
                                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{ind.name}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                );
                                            } else if (assessmentMode === 'simple_rubric') {
                                                return (
                                                    <div className="space-y-6 animate-in fade-in duration-500">
                                                        <div className="flex items-center gap-3 mb-6">
                                                            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary text-xs font-black flex items-center justify-center">
                                                                <Layers className="h-4 w-4" />
                                                            </div>
                                                            <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Penilaian Diri - Rubrik Sederhana</p>
                                                        </div>
                                                        {(assignment.instrument_config?.indicators || []).map((ind: any, idx: number) => (
                                                            <div key={idx} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 space-y-3">
                                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{ind.name}</p>
                                                                <div className="flex gap-2">
                                                                    {['Perlu Bimbingan', 'Cukup', 'Baik', 'Sangat Baik'].map((level, lvlIdx) => (
                                                                        <button
                                                                            key={level}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const newData = [...selfRubricData];
                                                                                if (!newData[idx]) newData[idx] = { name: ind.name, selected_level: '' };
                                                                                newData[idx].selected_level = level;
                                                                                setSelfRubricData(newData);
                                                                            }}
                                                                            className={`flex-1 py-2 px-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border-2 ${
                                                                                selfRubricData[idx]?.selected_level === level
                                                                                    ? lvlIdx === 0 ? 'bg-red-50 border-red-400 text-red-600'
                                                                                      : lvlIdx === 1 ? 'bg-amber-50 border-amber-400 text-amber-600'
                                                                                      : lvlIdx === 2 ? 'bg-blue-50 border-blue-400 text-blue-600'
                                                                                      : 'bg-emerald-50 border-emerald-400 text-emerald-600'
                                                                                    : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-muted-foreground hover:border-primary/30'
                                                                            }`}
                                                                        >
                                                                            {level}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            } else {
                                                return (
                                                    <div className="space-y-10 animate-in fade-in duration-500">
                                                        {/* Feelings Section */}
                                                        <div className="space-y-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 text-xs font-black flex items-center justify-center shadow-sm border border-amber-100 dark:border-amber-900/30">
                                                                    <Heart className="h-4 w-4" />
                                                                </div>
                                                                <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Bagaimana Perasaan Belajarmu?</p>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-4">
                                                                {[
                                                                    { id: 'very_happy', label: 'Sangat Senang', icon: '🤩' },
                                                                    { id: 'happy', label: 'Senang', icon: '😊' },
                                                                    { id: 'neutral', label: 'Kurang Senang', icon: '😐' },
                                                                ].map((item) => (
                                                                    <button
                                                                        key={item.id}
                                                                        type="button"
                                                                        onClick={() => setSelfAssessmentData({ ...selfAssessmentData, feeling: item.id })}
                                                                        className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all ${selfAssessmentData.feeling === item.id ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 shadow-xl shadow-amber-100/50' : 'border-slate-50 bg-slate-50/30 dark:border-slate-800'}`}
                                                                    >
                                                                        <span className="text-4xl">{item.icon}</span>
                                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${selfAssessmentData.feeling === item.id ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`}>{item.label}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <div className="space-y-3">
                                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-4">Berikan alasan singkat tentang perasaanmu:</label>
                                                                <textarea 
                                                                    rows={3}
                                                                    placeholder="Cth: Saya senang karena materi hari ini sangat seru dan mudah dipahami..."
                                                                    value={selfAssessmentData.feeling_reason}
                                                                    onChange={(e) => setSelfAssessmentData({ ...selfAssessmentData, feeling_reason: e.target.value })}
                                                                    className="w-full rounded-xl border border-slate-100 bg-slate-50/30 px-6 py-4 text-sm font-medium outline-none focus:border-amber-400 focus:bg-white transition-all shadow-sm dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-200"
                                                                ></textarea>
                                                            </div>
                                                        </div>

                                                        {/* Effort Scale Section */}
                                                        <div className="space-y-6 pt-10 border-t border-slate-50 dark:border-slate-800">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-xl bg-sky-50 dark:bg-sky-950/30 text-primary text-xs font-black flex items-center justify-center shadow-sm border border-sky-100 dark:border-sky-900/30">
                                                                    <Zap className="h-4 w-4" />
                                                                </div>
                                                                <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Seberapa Baik Usaha & Pemahamanmu?</p>
                                                            </div>
                                                            <div className="flex items-center justify-between gap-4">
                                                                {[1, 2, 3, 4].map((scale) => (
                                                                    <button
                                                                        key={scale}
                                                                        type="button"
                                                                        onClick={() => setSelfAssessmentData({ ...selfAssessmentData, effort_scale: scale })}
                                                                        className={`flex-1 h-16 rounded-xl border-2 flex items-center justify-center text-xl font-black transition-all ${selfAssessmentData.effort_scale === scale ? 'bg-sky-500 border-sky-500 text-white shadow-xl shadow-sky-200/50' : 'bg-slate-50/50 border-slate-50 text-slate-300 dark:bg-slate-800 dark:border-slate-800 hover:border-sky-200'}`}
                                                                    >
                                                                        {scale}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <div className="flex justify-between text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">
                                                                <span>Perlu Bimbingan</span>
                                                                <span>Sangat Baik</span>
                                                            </div>
                                                        </div>

                                                        {/* Reflection Section */}
                                                        <div className="space-y-6 pt-10 border-t border-slate-50 dark:border-slate-800">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 text-xs font-black flex items-center justify-center shadow-sm border border-indigo-100 dark:border-indigo-900/30">
                                                                    <BookOpen className="h-4 w-4" />
                                                                </div>
                                                                <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Catatan Refleksi</p>
                                                            </div>
                                                            <div className="space-y-3">
                                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-4">Tantangan yang dihadapi & strategi perbaikan:</label>
                                                                <textarea 
                                                                    rows={6}
                                                                    placeholder="Cth: Saya masih kesulitan di bagian perkalian, strateginya saya akan berlatih lebih banyak di rumah..."
                                                                    value={selfAssessmentData.reflection_notes}
                                                                    onChange={(e) => setSelfAssessmentData({ ...selfAssessmentData, reflection_notes: e.target.value })}
                                                                    className="w-full rounded-xl border border-slate-100 bg-slate-50/30 px-8 py-6 text-sm font-medium outline-none focus:border-indigo-400 focus:bg-white transition-all shadow-sm dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-200"
                                                                ></textarea>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        })()
                                    ) : (assignment.instrument_type === 'written_test' || (assignment.instrument_type === 'formative_quiz' && (assignment.instrument_config?.assessment_mode || 'rubrik') === 'rubrik')) ? (
                                        <div className="space-y-12 animate-in fade-in duration-700">
                                            {/* Test Header & Progress */}
                                            <div className="relative overflow-hidden rounded-xl bg-slate-50 border border-slate-200 dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md dark:border-slate-800 border-slate-100 p-6 shadow-none text-slate-800 text-foreground">
                                                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
                                                <div className="relative flex items-center justify-between">
                                                    <div className="flex items-center gap-5">
                                                        <div className="h-11 w-11 rounded-lg bg-primary/10 dark:bg-primary text-primary dark:text-white shadow-none flex items-center justify-center shadow-xl">
                                                            <ListChecks className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold tracking-[-0.03em] text-lg text-slate-800 text-foreground">
                                                                 {assignment.instrument_type === 'formative_quiz' ? 'Tes/Penugasan Singkat (Umpan Balik Instan)' : 'Lembar Tes Tertulis'}
                                                            </h3>
                                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">
                                                                {assignment.instrument_type === 'formative_quiz' ? 'Jawab & Pelajari Langsung Pembahasannya!' : 'Fokus & Teliti'} • {assignment.instrument_config?.questions?.length || 0} Pertanyaan
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-semibold text-slate-500 text-muted-foreground uppercase tracking-wider mb-1">Total Poin</p>
                                                        <p className="text-2xl font-semibold tracking-tight">{assignment.max_points}</p>
                                                    </div>
                                                </div>
                                                
                                                {/* Progress Bar */}
                                                <div className="mt-8">
                                                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider mb-2 text-slate-500 text-muted-foreground">
                                                        <span>Progres Pengerjaan</span>
                                                        <span>{Math.round((Object.keys(studentForm.data.answers).length / (assignment.instrument_config?.questions?.length || 1)) * 100)}%</span>
                                                    </div>
                                                    <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-950/40 bg-slate-50 overflow-hidden">
                                                        <div 
                                                            className="h-full bg-primary transition-all duration-500"
                                                            style={{ width: `${(Object.keys(studentForm.data.answers).length / (assignment.instrument_config?.questions?.length || 1)) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-8">
                                                {(assignment.instrument_config?.questions || []).map((q: any, idx: number) => {
                                                    const isSubmitted = Boolean(my_submission);
                                                    const showCorrection = isSubmitted && !isRetryActive && !my_submission?.is_remedial_open;
                                                    const studentAns = studentForm.data.answers[q.id];
                                                    const isAnswered = studentAns !== undefined && studentAns !== '';
                                                    
                                                    // Determine correct option for post-submission check
                                                    const rawCorrectId = q.answer || q.options?.find((o: any) => o.is_correct)?.id || '';
                                                    const correctOptId = String(rawCorrectId).trim().toLowerCase();
                                                    const normalizedStudentAns = String(studentAns ?? '').trim().toLowerCase();
                                                    const isAnswerMatch = (a: string, b: string) => {
                                                        if (!a || !b) return false;
                                                        return a === b || (b.startsWith(a) && a.length === 1) || (a.startsWith(b) && b.length === 1);
                                                    };
                                                    const isCorrect = showCorrection && isAnswerMatch(normalizedStudentAns, correctOptId);

                                                    return (
                                                        <div 
                                                            key={q.id || idx} 
                                                            className={`group relative transition-all duration-150 rounded-xl border border-slate-200 bg-white dark:border-slate-800 border-slate-100 dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md p-6 shadow-none ${
                                                                showCorrection
                                                                    ? isCorrect
                                                                        ? 'border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-950/10'
                                                                        : 'border-rose-500/50 bg-rose-500/5 dark:bg-rose-950/10'
                                                                    : isAnswered
                                                                        ? 'border-primary/50 bg-primary/5 dark:bg-[#1E1E2A]' 
                                                                        : 'hover:border-[#6E79D6]/50 hover:bg-slate-50/50 dark:hover:bg-[#1E1E2A]/20'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-3 mb-6">
                                                                <span className="font-mono text-xs font-semibold text-slate-500 text-muted-foreground bg-slate-50 dark:bg-slate-950/40 bg-slate-50 px-2.5 py-1 rounded-[4px] border border-slate-200 dark:border-slate-800 border-slate-100">Soal #{idx + 1}</span>
                                                                {showCorrection && (
                                                                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                                                        isCorrect 
                                                                            ? 'bg-emerald-500 text-white' 
                                                                            : 'bg-rose-500 text-white'
                                                                    }`}>
                                                                        {isCorrect ? '✨ Benar' : '❌ Kurang Tepat'}
                                                                    </span>
                                                                )}
                                                                <div className="h-px flex-1 bg-slate-200 dark:bg-[#2C2C3A]"></div>
                                                            </div>

                                                            <div className="space-y-6">
                                                                <div className="space-y-4">
                                                                    <div className="flex items-start justify-between gap-4">
                                                                        <h4 className="leading-relaxed text-sm font-bold tracking-[-0.01em] text-slate-850 text-foreground">
                                                                            {q.question || q.text || q.prompt || `Pertanyaan #${idx + 1}`}
                                                                        </h4>
                                                                        <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap border bg-primary/10 text-primary dark:text-[#6E79D6] border-primary/20">{q.points || 20} Pts</span>
                                                                    </div>
                                                                    {q.image_url && (
                                                                        <div className="rounded-xl overflow-hidden border border-border shadow-md max-w-xl">
                                                                            <img src={q.image_url} alt="Stimulus" className="w-full object-cover" />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="space-y-3">
                                                                    {q.type === 'multiple_choice' && (
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                            {q.options?.map((opt: any, optIdx: number) => {
                                                                                const optId = String(opt?.id || ['a', 'b', 'c', 'd', 'e'][optIdx] || String.fromCharCode(97 + optIdx)).toLowerCase();
                                                                                const isSelected = isAnswerMatch(normalizedStudentAns, optId);
                                                                                const isOptCorrect = isAnswerMatch(optId, correctOptId);

                                                                                let btnStyle = 'border-slate-200 dark:border-slate-800 border-slate-100 bg-white dark:bg-slate-950/40 bg-slate-50 hover:bg-slate-50 dark:hover:bg-[#1F1F2E] hover:border-[#6E79D6]/50';
                                                                                let badgeStyle = 'border-slate-200 dark:border-slate-800 border-slate-100 bg-slate-50 dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md text-slate-500 text-muted-foreground group-hover/opt:border-[#6E79D6] group-hover/opt:text-[#6E79D6]';
                                                                                
                                                                                if (showCorrection) {
                                                                                    if (isOptCorrect) {
                                                                                        btnStyle = 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-950/20';
                                                                                        badgeStyle = 'bg-emerald-500 border-emerald-500 text-white';
                                                                                    } else if (isSelected && !isOptCorrect) {
                                                                                        btnStyle = 'border-rose-500 bg-rose-500/10 dark:bg-rose-950/20';
                                                                                        badgeStyle = 'bg-rose-500 border-rose-500 text-white';
                                                                                    } else {
                                                                                        btnStyle = 'border-slate-200 dark:border-slate-800 border-slate-100 bg-white dark:bg-slate-950/40 bg-slate-50 opacity-60';
                                                                                    }
                                                                                } else {
                                                                                    // Test taking mode
                                                                                    if (isSelected) {
                                                                                        btnStyle = 'border-primary bg-primary/10 dark:bg-[#1E1E2A]';
                                                                                        badgeStyle = 'bg-primary border-primary text-white';
                                                                                    }
                                                                                }

                                                                                return (
                                                                                    <button 
                                                                                        key={optId}
                                                                                        type="button"
                                                                                        disabled={isSummativeLocked || (showCorrection && assignment.assessment_type === 'summative')}
                                                                                        onClick={() => {
                                                                                            if (showCorrection && assignment.assessment_type === 'summative') return;
                                                                                            studentForm.setData('answers', { ...studentForm.data.answers, [q.id]: optId });
                                                                                        }}
                                                                                        className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left group/opt cursor-pointer ${btnStyle} ${isSummativeLocked ? 'opacity-55 cursor-not-allowed' : ''}`}
                                                                                    >
                                                                                        <div className={`h-6 w-6 rounded-full border flex items-center justify-center flex-shrink-0 font-semibold text-[11px] font-mono transition-all ${badgeStyle}`}>
                                                                                            {String.fromCharCode(65 + optIdx)}
                                                                                        </div>
                                                                                        <span className={`text-xs font-semibold ${isSelected ? 'text-primary font-bold' : 'text-slate-700 text-muted-foreground'}`}>{opt.text}</span>
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}

                                                                    {q.type === 'short_answer' && (
                                                                        <div className="space-y-2">
                                                                            <div className="relative">
                                                                                <input 
                                                                                    type="text"
                                                                                    value={studentForm.data.answers[q.id] || ''}
                                                                                    disabled={isSummativeLocked || (showCorrection && assignment.assessment_type === 'summative')}
                                                                                    onChange={(e) => studentForm.setData('answers', { ...studentForm.data.answers, [q.id]: e.target.value })}
                                                                                    placeholder="Ketik jawaban singkat Anda..."
                                                                                    className={`w-full rounded-lg border bg-white dark:bg-slate-950/40 bg-slate-50 px-4 py-3 text-xs font-medium focus:ring-1 focus:ring-primary/15 transition-all text-slate-800 text-foreground placeholder-slate-450 dark:placeholder-[#8A8F98] ${
                                                                                        showCorrection
                                                                                            ? isCorrect
                                                                                                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5'
                                                                                                : 'border-rose-500 text-rose-600 dark:text-rose-450 bg-rose-500/5'
                                                                                            : 'border-slate-200 dark:border-slate-800 border-slate-100 focus:border-primary'
                                                                                    }`}
                                                                                />
                                                                                <PenTool className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {q.type === 'essay' && (
                                                                        <div className="relative">
                                                                            <textarea 
                                                                                rows={4}
                                                                                value={studentForm.data.answers[q.id] || ''}
                                                                                disabled={isSummativeLocked || (showCorrection && assignment.assessment_type === 'summative')}
                                                                                onChange={(e) => studentForm.setData('answers', { ...studentForm.data.answers, [q.id]: e.target.value })}
                                                                                placeholder="Tuliskan uraian atau penjelasan lengkap Anda..."
                                                                                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 border-slate-100 bg-white dark:bg-slate-950/40 bg-slate-50 px-4 py-3 text-xs font-medium focus:border-primary focus:ring-1 focus:ring-primary/15 transition-all text-slate-800 text-foreground placeholder-slate-450 dark:placeholder-[#8A8F98] resize-none leading-relaxed disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-900/50"
                                                                            />
                                                                            <FileText className="absolute right-4 top-4 h-4 w-4 text-slate-400" />
                                                                        </div>
                                                                    )}

                                                                    {/* Post-Submission Feedback & Answer Guide */}
                                                                    {showCorrection && (
                                                                        <div className="mt-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-2 duration-300">
                                                                            <div className="flex items-center gap-2 mb-2 text-primary">
                                                                                <Info className="h-3.5 w-3.5" />
                                                                                <span className="text-[10px] font-bold uppercase tracking-wider">Kunci Jawaban & Pembahasan</span>
                                                                            </div>
                                                                            <p className="text-xs text-slate-600 text-muted-foreground leading-relaxed">
                                                                                {q.explanation || q.answer_guide || `Kunci jawaban yang benar adalah ${q.type === 'multiple_choice' ? String.fromCharCode(65 + Math.max(0, q.options?.findIndex((o: any) => o.id == correctOptId || o.is_correct))) : q.correct_answer || q.answer || '-'}.`}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : assignment.instrument_type === 'quiz_survey' ? (
                                        <div className="space-y-10 animate-in fade-in duration-500">
                                            {(assignment.instrument_config?.questions || []).map((q: any, idx: number) => (
                                                <div key={q.id || idx} className="space-y-4 animate-in slide-in-from-bottom-4 duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                                                    <div className="flex items-start gap-4">
                                                        <div className="h-8 w-8 rounded-xl bg-sky-50 dark:bg-sky-950/30 text-primary text-xs font-black flex items-center justify-center flex-shrink-0 shadow-sm border border-sky-100 dark:border-sky-900/30">
                                                            {idx + 1}
                                                        </div>
                                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed pt-1">{q.question || q.text || q.prompt || `Pertanyaan #${idx + 1}`}</p>
                                                    </div>
                                                    <div className="pl-12">
                                                        {q.type === 'essay' ? (
                                                            <textarea 
                                                                rows={4}
                                                                placeholder="Tuliskan jawaban esai Anda..."
                                                                value={studentForm.data.answers[q.id] || ''}
                                                                disabled={isSummativeLocked}
                                                                onChange={(e) => studentForm.setData('answers', { ...studentForm.data.answers, [q.id]: e.target.value })}
                                                                className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-5 py-4 text-sm font-medium outline-none focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-50 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-200 transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed"
                                                            ></textarea>
                                                        ) : q.type === 'multiple_choice' ? (
                                                            <div className="grid gap-3">
                                                                {(q.options || []).map((opt: any, optIdx: number) => (
                                                                    <label key={opt.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all group shadow-sm ${studentForm.data.answers[q.id] === opt.id.toString() ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/20' : 'border-slate-50 bg-white dark:bg-slate-900 dark:border-slate-800 hover:border-sky-200'} ${isSummativeLocked ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}>
                                                                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${studentForm.data.answers[q.id] === opt.id.toString() ? 'border-sky-500 bg-sky-500' : 'border-slate-200 group-hover:border-sky-300'}`}>
                                                                            {studentForm.data.answers[q.id] === opt.id.toString() && <div className="h-2 w-2 rounded-full bg-white" />}
                                                                        </div>
                                                                        <input 
                                                                            type="radio" 
                                                                            name={`q-${q.id}`} 
                                                                            checked={studentForm.data.answers[q.id] === opt.id.toString()}
                                                                            disabled={isSummativeLocked}
                                                                            onChange={() => studentForm.setData('answers', { ...studentForm.data.answers, [q.id]: opt.id.toString() })}
                                                                            className="sr-only"
                                                                        />
                                                                        <div className="flex items-center gap-3">
                                                                            <span className={`text-[10px] font-black uppercase tracking-widest ${studentForm.data.answers[q.id] === opt.id.toString() ? 'text-primary' : 'text-muted-foreground'}`}>
                                                                                {String.fromCharCode(65 + optIdx)}.
                                                                            </span>
                                                                            <span className={`text-sm font-bold ${studentForm.data.answers[q.id] === opt.id.toString() ? 'text-foreground' : 'text-slate-600 dark:text-muted-foreground'}`}>
                                                                                {opt.text}
                                                                            </span>
                                                                        </div>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <input 
                                                                type="text" 
                                                                placeholder="Ketik jawaban singkat..."
                                                                value={studentForm.data.answers[q.id] || ''}
                                                                disabled={isSummativeLocked}
                                                                onChange={(e) => studentForm.setData('answers', { ...studentForm.data.answers, [q.id]: e.target.value })}
                                                                className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-5 py-4 text-sm font-bold outline-none focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-50 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-200 transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed"
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="pt-8 border-t border-slate-50 dark:border-slate-800 space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle className="h-4 w-4 text-amber-500" />
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Catatan Tambahan untuk Pengajar</p>
                                                </div>
                                                <textarea 
                                                    rows={4}
                                                    placeholder="Rangkuman jawaban atau hal yang ingin Anda sampaikan terkait kuis ini..."
                                                    value={studentForm.data.content}
                                                    onChange={(e) => studentForm.setData('content', e.target.value)}
                                                    className="w-full rounded-xl border border-slate-100 bg-slate-50/30 px-6 py-5 text-sm font-medium outline-none focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-50 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-200 transition-all shadow-sm"
                                                ></textarea>
                                            </div>
                                        </div>
                                    ) : (assignment.instrument_type === 'formative_quiz' && (assignment.instrument_config?.assessment_mode) === 'checklist') ? (
                                        <div className="space-y-6 animate-in fade-in duration-500">
                                            <div className="relative overflow-hidden rounded-xl bg-slate-50 border border-slate-200 dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md dark:border-slate-800 border-slate-100 p-6 shadow-none text-slate-800 text-foreground">
                                                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
                                                <div className="relative flex items-center gap-5">
                                                    <div className="h-11 w-11 rounded-lg bg-primary/10 dark:bg-primary text-primary dark:text-white shadow-none flex items-center justify-center">
                                                        <CheckSquare className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold tracking-[-0.03em] text-lg text-slate-800 text-foreground">Ceklis Jawaban</h3>
                                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Tandai pertanyaan yang bisa kamu jawab</p>
                                                    </div>
                                                </div>
                                            </div>
                                            {(assignment.instrument_config?.indicators || []).map((ind: any, idx: number) => (
                                                <label key={idx} className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 border-slate-100 bg-white dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md hover:border-primary/50 transition-all cursor-pointer group shadow-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={quizChecklistData[idx]?.checked || false}
                                                        onChange={() => {
                                                            const newData = [...quizChecklistData];
                                                            if (!newData[idx]) newData[idx] = { name: ind.name, checked: false };
                                                            newData[idx].checked = !newData[idx].checked;
                                                            setQuizChecklistData(newData);
                                                        }}
                                                        className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                                                    />
                                                    <div className="flex-1">
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{ind.name}</span>
                                                        {ind.note && <p className="text-[10px] text-muted-foreground mt-0.5">Kunci: {ind.note}</p>}
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    ) : assignment.instrument_type === 'exit_ticket' ? (
                                        (assignment.instrument_config?.assessment_mode || 'default') === 'default' ? (
                                        <div className="space-y-12 animate-in fade-in duration-700">
                                            {/* Exit Ticket Header & Progress */}
                                            <div className="relative overflow-hidden rounded-xl bg-slate-50 border border-slate-200 dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md dark:border-slate-800 border-slate-100 p-6 shadow-none text-slate-800 text-foreground">
                                                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
                                                <div className="relative flex items-center justify-between">
                                                    <div className="flex items-center gap-5">
                                                        <div className="h-11 w-11 rounded-lg bg-primary/10 dark:bg-primary text-primary dark:text-white shadow-none flex items-center justify-center">
                                                            <Ticket className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold tracking-[-0.03em] text-lg text-slate-800 text-foreground">
                                                                Exit Ticket / Refleksi Akhir Kelas
                                                            </h3>
                                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Bagikan pemahamanmu hari ini secara instan!</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Progress Bar */}
                                                <div className="mt-8">
                                                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider mb-2 text-slate-500 text-muted-foreground">
                                                        <span>Progres Pengisian</span>
                                                        <span>{studentForm.data.answers.emoji ? '100%' : '50%'}</span>
                                                    </div>
                                                    <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-950/40 bg-slate-50 overflow-hidden">
                                                        <div 
                                                            className="h-full bg-primary transition-all duration-500"
                                                            style={{ width: `${studentForm.data.answers.emoji ? 100 : 50}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-8">
                                                {/* Emoji Rating Cards */}
                                                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 border-slate-100 dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md p-6 shadow-none space-y-6">
                                                    <div>
                                                        <h4 className="text-sm font-semibold tracking-[-0.01em] text-slate-850 text-foreground leading-relaxed">
                                                            Seberapa baik kamu memahami materi pembelajaran hari ini?
                                                        </h4>
                                                        <p className="text-xs text-slate-500 text-muted-foreground mt-1">Pilih emoji yang paling menggambarkan tingkat kepahamanmu.</p>
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-4">
                                                        {[
                                                            { id: 'paham', emoji: '😊', label: 'Paham', desc: 'Sangat paham materi hari ini', color: 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
                                                            { id: 'ragu', emoji: '😐', label: 'Ragu-Ragu', desc: 'Masih butuh latihan/baca lagi', color: 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400' },
                                                            { id: 'bingung', emoji: 'bingung', label: 'Bingung', desc: 'Sulit mengerti penjelasan guru', color: 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-450' }
                                                        ].map((item) => {
                                                            const isSelected = studentForm.data.answers.emoji === item.id;
                                                            return (
                                                                <button
                                                                    key={item.id}
                                                                    type="button"
                                                                    disabled={isSummativeLocked}
                                                                    onClick={() => studentForm.setData('answers', { ...studentForm.data.answers, emoji: item.id })}
                                                                    className={`flex flex-col items-center justify-center p-5 rounded-xl border-2 transition-all duration-300 ${isSummativeLocked ? 'opacity-55 cursor-not-allowed pointer-events-none' : 'hover:scale-[1.03] active:scale-95'} text-center ${
                                                                        isSelected 
                                                                            ? item.color + ' border-current shadow-lg shadow-slate-100 dark:shadow-none' 
                                                                            : 'border-slate-200 dark:border-slate-800 border-slate-100 bg-white dark:bg-slate-950/40 bg-slate-50 hover:border-primary/50'
                                                                    }`}
                                                                >
                                                                    <span className="text-4xl mb-2 transition-transform duration-300 hover:rotate-12 select-none">
                                                                        {item.id === 'bingung' ? '🙁' : item.emoji}
                                                                    </span>
                                                                    <span className="text-xs font-bold block mb-1">{item.label}</span>
                                                                    <span className="text-[9px] font-medium text-slate-400 text-muted-foreground max-w-[120px] hidden md:inline-block">{item.desc}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Reflection Questions */}
                                                {(assignment.instrument_config?.questions && assignment.instrument_config.questions.length > 0) ? (
                                                    <div className="space-y-6">
                                                        {assignment.instrument_config.questions.map((q: any, idx: number) => (
                                                            <div key={idx} className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 border-slate-100 dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md p-6 shadow-none space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                                                                <div className="flex items-start gap-3">
                                                                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                                                                    <h4 className="text-sm font-semibold tracking-[-0.01em] text-slate-855 text-foreground leading-relaxed">{q.text}</h4>
                                                                </div>
                                                                <div className="relative">
                                                                    <textarea 
                                                                        rows={3}
                                                                        maxLength={280}
                                                                        value={exitStandardAnswers[idx]?.answer || ''}
                                                                        onChange={(e) => {
                                                                            const newAnswers = [...exitStandardAnswers];
                                                                            if (!newAnswers[idx]) newAnswers[idx] = { question: q.text, answer: '' };
                                                                            newAnswers[idx].answer = e.target.value;
                                                                            setExitStandardAnswers(newAnswers);
                                                                        }}
                                                                        placeholder="Tuliskan jawaban refleksi Anda..."
                                                                        className="w-full rounded-lg border border-slate-200 dark:border-slate-800 border-slate-100 bg-white dark:bg-slate-950/40 bg-slate-50 px-4 py-3 text-xs font-medium focus:border-primary focus:ring-1 focus:ring-primary/15 transition-all text-slate-800 text-foreground placeholder-slate-450 dark:placeholder-[#8A8F98] resize-none leading-relaxed"
                                                                    />
                                                                    <div className="absolute right-4 bottom-4 flex items-center gap-2">
                                                                        <span className={`text-[10px] font-mono font-bold ${
                                                                            (280 - (exitStandardAnswers[idx]?.answer?.length || 0)) <= 20 
                                                                                ? 'text-rose-500' 
                                                                                : 'text-slate-400'
                                                                        }`}>
                                                                            {280 - (exitStandardAnswers[idx]?.answer?.length || 0)} karakter tersisa
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 border-slate-100 dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md p-6 shadow-none space-y-6">
                                                        <div>
                                                            <h4 className="text-sm font-semibold tracking-[-0.01em] text-slate-850 text-foreground leading-relaxed">
                                                                Tuliskan refleksi singkat pembelajaranmu hari ini
                                                            </h4>
                                                            <p className="text-xs text-slate-500 text-muted-foreground mt-1">Sebutkan bagian tersulit atau hal baru menarik yang kamu pelajari.</p>
                                                        </div>

                                                        <div className="relative">
                                                            <textarea 
                                                                rows={4}
                                                                maxLength={280}
                                                                value={studentForm.data.answers.reflection || ''}
                                                                disabled={isSummativeLocked}
                                                                onChange={(e) => studentForm.setData('answers', { ...studentForm.data.answers, reflection: e.target.value })}
                                                                placeholder="Apa yang paling menantang dari materi hari ini? Apa yang ingin kamu tanyakan lebih lanjut? (Maksimal 280 karakter)"
                                                                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 border-slate-100 bg-white dark:bg-slate-950/40 bg-slate-50 px-4 py-3 text-xs font-medium focus:border-primary focus:ring-1 focus:ring-primary/15 transition-all text-slate-800 text-foreground placeholder-slate-450 dark:placeholder-[#8A8F98] resize-none leading-relaxed disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-900/50"
                                                            />
                                                            <div className="absolute right-4 bottom-4 flex items-center gap-2">
                                                                <span className={`text-[10px] font-mono font-bold ${
                                                                    (280 - (studentForm.data.answers.reflection?.length || 0)) <= 20 
                                                                        ? 'text-rose-500' 
                                                                        : 'text-slate-400'
                                                                }`}>
                                                                    {280 - (studentForm.data.answers.reflection?.length || 0)} karakter tersisa
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        ) : (assignment.instrument_config?.assessment_mode) === 'checklist' ? (
                                        <div className="space-y-6 animate-in fade-in duration-500">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary text-xs font-black flex items-center justify-center">
                                                    <CheckSquare className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Exit Ticket - Mode Ceklis</p>
                                                    <p className="text-[10px] text-muted-foreground font-medium">Tandai indikator pemahaman yang sudah kamu capai</p>
                                                </div>
                                            </div>
                                            {(assignment.instrument_config?.indicators || []).map((ind: any, idx: number) => (
                                                <label key={idx} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={exitChecklistData[idx]?.checked || false}
                                                        onChange={() => {
                                                            const newData = [...exitChecklistData];
                                                            if (!newData[idx]) newData[idx] = { name: ind.name, checked: false };
                                                            newData[idx].checked = !newData[idx].checked;
                                                            setExitChecklistData(newData);
                                                        }}
                                                        className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                                                    />
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{ind.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                        ) : (
                                        <div className="space-y-6 animate-in fade-in duration-500">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary text-xs font-black flex items-center justify-center">
                                                    <FileText className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Exit Ticket - Catatan Singkat</p>
                                                    <p className="text-[10px] text-muted-foreground font-medium">Jawab pertanyaan singkat berikut secara singkat dan jelas</p>
                                                </div>
                                            </div>
                                            {(assignment.instrument_config?.questions || []).map((q: any, idx: number) => (
                                                <div key={idx} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 space-y-3">
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{q.text}</p>
                                                    <input
                                                        type="text"
                                                        value={exitShortNoteData[idx]?.answer || ''}
                                                        onChange={(e) => {
                                                            const newData = [...exitShortNoteData];
                                                            if (!newData[idx]) newData[idx] = { text: q.text, answer: '' };
                                                            newData[idx].answer = e.target.value;
                                                            setExitShortNoteData(newData);
                                                        }}
                                                        maxLength={280}
                                                        placeholder="Jawaban singkat..."
                                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-xs font-medium focus:border-primary focus:ring-1 focus:ring-primary/15 transition-all text-slate-800 dark:text-slate-200 placeholder-slate-400"
                                                    />
                                                    <div className="flex justify-end">
                                                        <span className="text-[10px] font-mono text-muted-foreground">
                                                            {280 - (exitShortNoteData[idx]?.answer?.length || 0)} karakter tersisa
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        )
                                    ) : assignment.instrument_type === 'structured_assignment' ? (
                                        <div className="space-y-8 animate-in fade-in duration-500">
                                            <div className="relative overflow-hidden rounded-xl bg-slate-50 border border-slate-200 dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md dark:border-slate-800 border-slate-100 p-6 shadow-none text-slate-800 text-foreground">
                                                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
                                                <div className="relative flex items-center gap-5">
                                                    <div className="h-11 w-11 rounded-lg bg-primary/10 dark:bg-primary text-primary dark:text-white shadow-none flex items-center justify-center">
                                                        <FileText className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold tracking-[-0.03em] text-lg text-slate-800 text-foreground">Penugasan Terstruktur (LKPD)</h3>
                                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Kerjakan tugas dan kumpulkan jawabanmu</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Jawaban Teks</label>
                                                <textarea
                                                    rows={8}
                                                    value={structuredAssignmentData.answer_text}
                                                    disabled={isSummativeLocked}
                                                    onChange={(e) => setStructuredAssignmentData({ ...structuredAssignmentData, answer_text: e.target.value })}
                                                    placeholder="Tuliskan jawaban atau hasil kerja Anda di sini..."
                                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 border-slate-100 bg-white dark:bg-slate-950/40 bg-slate-50 px-4 py-3 text-xs font-medium focus:border-primary focus:ring-1 focus:ring-primary/15 transition-all text-slate-800 text-foreground placeholder-slate-400 resize-none leading-relaxed disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-900/50"
                                                />
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Lampiran File (Opsional)</label>
                                                {my_submission?.file_path && (
                                                    <div className="mb-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 bg-slate-50 border border-slate-200 dark:border-slate-800 border-slate-100 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-lg bg-white dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md border border-slate-200 dark:border-slate-800 border-slate-100 flex items-center justify-center text-primary">
                                                                <FileText className="h-6 w-6" />
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="text-[10px] font-bold text-primary uppercase tracking-wider leading-none mb-1">File Terkirim</p>
                                                                <p className="text-xs font-semibold text-slate-550 text-muted-foreground truncate max-w-[200px]">{my_submission.file_path.split('/').pop()}</p>
                                                            </div>
                                                        </div>
                                                        <a 
                                                            href={`/storage/${my_submission.file_path}`} 
                                                            target="_blank"
                                                            className="h-8 px-4 rounded-lg bg-primary text-white text-[10px] font-bold uppercase tracking-wider flex items-center justify-center hover:bg-[#4E5BBF] transition-all"
                                                        >
                                                            Lihat File
                                                        </a>
                                                    </div>
                                                )}
                                                <p className="text-[10px] text-muted-foreground">Format: PDF, DOC, DOCX, PNG, JPG (Maks 10MB)</p>
                                                <input
                                                    type="file"
                                                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                                    disabled={isSummativeLocked}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0] || null;
                                                        setStructuredAssignmentData({ ...structuredAssignmentData, file });
                                                    }}
                                                    className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer"
                                                />
                                                {structuredAssignmentData.file && (
                                                    <p className="text-[10px] text-emerald-600 font-medium">File dipilih: {structuredAssignmentData.file.name}</p>
                                                )}
                                            </div>
                                        </div>
                                    ) : assignment.instrument_type === 'project' ? (
                                        <div className="space-y-8 animate-in fade-in duration-500">
                                            <div className="relative overflow-hidden rounded-xl bg-slate-50 border border-slate-200 dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md dark:border-slate-800 border-slate-100 p-6 shadow-none text-slate-800 text-foreground">
                                                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
                                                <div className="relative flex items-center gap-5">
                                                    <div className="h-11 w-11 rounded-lg bg-primary/10 dark:bg-primary text-primary dark:text-white shadow-none flex items-center justify-center">
                                                        <FolderKanban className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold tracking-[-0.03em] text-lg text-slate-800 text-foreground">Penilaian Proyek & Produk</h3>
                                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Kerjakan proyek dan kumpulkan hasilnya</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {assignment.instrument_config?.stimulus && (
                                                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 border-slate-100 bg-white dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md shadow-none">
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Pertanyaan Utama (Driving Question):</p>
                                                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium italic">{assignment.instrument_config.stimulus}</p>
                                                </div>
                                            )}

                                            {assignment.instrument_config?.teacher_notes && (
                                                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 border-slate-100 bg-white dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md shadow-none">
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Alur & Instruksi:</p>
                                                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">{assignment.instrument_config.teacher_notes}</p>
                                                </div>
                                            )}

                                            <div className="grid md:grid-cols-3 gap-4">
                                                {assignment.instrument_config?.phase_planning && (
                                                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 border-slate-100 bg-white dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md shadow-none">
                                                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">📋 Perencanaan</p>
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">{assignment.instrument_config.phase_planning}</p>
                                                    </div>
                                                )}
                                                {assignment.instrument_config?.phase_execution && (
                                                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 border-slate-100 bg-white dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md shadow-none">
                                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">🔧 Pelaksanaan</p>
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">{assignment.instrument_config.phase_execution}</p>
                                                    </div>
                                                )}
                                                {assignment.instrument_config?.phase_product && (
                                                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 border-slate-100 bg-white dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md shadow-none">
                                                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">📦 Produk/Hasil</p>
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">{assignment.instrument_config.phase_product}</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Deskripsi Proyek</label>
                                                <textarea
                                                    rows={6}
                                                    value={projectData.description}
                                                    disabled={isSummativeLocked}
                                                    onChange={(e) => setProjectData({ ...projectData, description: e.target.value })}
                                                    placeholder="Jelaskan proyek yang Anda kerjakan: apa yang dibuat, bagaimana prosesnya, dan hasil akhirnya..."
                                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 border-slate-100 bg-white dark:bg-slate-950/40 bg-slate-50 px-4 py-3 text-xs font-medium focus:border-primary focus:ring-1 focus:ring-primary/15 transition-all text-slate-800 text-foreground placeholder-slate-400 resize-none leading-relaxed disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-900/50"
                                                />
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Upload Bukti Proyek</label>
                                                {my_submission?.file_path && (
                                                    <div className="mb-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 bg-slate-50 border border-slate-200 dark:border-slate-800 border-slate-100 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-lg bg-white dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md border border-slate-200 dark:border-slate-800 border-slate-100 flex items-center justify-center text-primary">
                                                                <FileText className="h-6 w-6" />
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="text-[10px] font-bold text-primary uppercase tracking-wider leading-none mb-1">File Terkirim</p>
                                                                <p className="text-xs font-semibold text-slate-550 text-muted-foreground truncate max-w-[200px]">{my_submission.file_path.split('/').pop()}</p>
                                                            </div>
                                                        </div>
                                                        <a 
                                                            href={`/storage/${my_submission.file_path}`} 
                                                            target="_blank"
                                                            className="h-8 px-4 rounded-lg bg-primary text-white text-[10px] font-bold uppercase tracking-wider flex items-center justify-center hover:bg-[#4E5BBF] transition-all"
                                                        >
                                                            Lihat File
                                                        </a>
                                                    </div>
                                                )}
                                                <p className="text-[10px] text-muted-foreground">Format: PDF, DOC, DOCX, PNG, JPG, MP4 (Maks 50MB)</p>
                                                <input
                                                    type="file"
                                                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.mp4"
                                                    disabled={isSummativeLocked}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0] || null;
                                                        setProjectData({ ...projectData, file });
                                                    }}
                                                    className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer"
                                                />
                                                {projectData.file && (
                                                    <p className="text-[10px] text-emerald-600 font-medium">File dipilih: {projectData.file.name}</p>
                                                )}
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Catatan Proses</label>
                                                <p className="text-[10px] text-muted-foreground">Ceritakan tantangan yang dihadapi, solusi yang diterapkan, dan pembelajaran yang didapat.</p>
                                                <textarea
                                                    rows={4}
                                                    value={projectData.process_notes}
                                                    disabled={isSummativeLocked}
                                                    onChange={(e) => setProjectData({ ...projectData, process_notes: e.target.value })}
                                                    placeholder="Tantangan: ..., Solusi: ..., Pembelajaran: ..."
                                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 border-slate-100 bg-white dark:bg-slate-950/40 bg-slate-50 px-4 py-3 text-xs font-medium focus:border-primary focus:ring-1 focus:ring-primary/15 transition-all text-slate-800 text-foreground placeholder-slate-400 resize-none leading-relaxed disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-900/50"
                                                />
                                            </div>
                                        </div>
                                    ) : assignment.instrument_type === 'portfolio' ? (
                                        <div className="space-y-8 animate-in fade-in duration-500">
                                            <div className="relative overflow-hidden rounded-xl bg-slate-50 border border-slate-200 dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md dark:border-slate-800 border-slate-100 p-6 shadow-none text-slate-800 text-foreground">
                                                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
                                                <div className="relative flex items-center gap-5">
                                                    <div className="h-11 w-11 rounded-lg bg-primary/10 dark:bg-primary text-primary dark:text-white shadow-none flex items-center justify-center">
                                                        <Briefcase className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold tracking-[-0.03em] text-lg text-slate-800 text-foreground">Portofolio</h3>
                                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Kumpulkan karya terbaikmu dan refleksikan perkembangan belajarmu</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {assignment.instrument_config?.stimulus && (
                                                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 border-slate-100 bg-white dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md shadow-none">
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Instruksi Pengumpulan:</p>
                                                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium italic">{assignment.instrument_config.stimulus}</p>
                                                </div>
                                            )}

                                            <div className="space-y-3">
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Upload Karya Portofolio</label>
                                                {my_submission?.file_path && (
                                                    <div className="mb-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 bg-slate-50 border border-slate-200 dark:border-slate-800 border-slate-100 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-lg bg-white dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md border border-slate-200 dark:border-slate-800 border-slate-100 flex items-center justify-center text-primary">
                                                                <FileText className="h-6 w-6" />
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="text-[10px] font-bold text-primary uppercase tracking-wider leading-none mb-1">File Terkirim</p>
                                                                <p className="text-xs font-semibold text-slate-550 text-muted-foreground truncate max-w-[200px]">{my_submission.file_path.split('/').pop()}</p>
                                                            </div>
                                                        </div>
                                                        <a 
                                                            href={`/storage/${my_submission.file_path}`} 
                                                            target="_blank"
                                                            className="h-8 px-4 rounded-lg bg-primary text-white text-[10px] font-bold uppercase tracking-wider flex items-center justify-center hover:bg-[#4E5BBF] transition-all"
                                                        >
                                                            Lihat File
                                                        </a>
                                                    </div>
                                                )}
                                                <p className="text-[10px] text-muted-foreground">Format: PDF, DOC, DOCX, PNG, JPG (Maks 10MB per file)</p>
                                                <input
                                                    type="file"
                                                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                                    multiple
                                                    disabled={isSummativeLocked}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0] || null;
                                                        setPortfolioFile(file);
                                                    }}
                                                    className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer"
                                                />
                                                {portfolioFile && (
                                                    <p className="text-[10px] text-emerald-600 font-medium">File dipilih: {portfolioFile.name}</p>
                                                )}
                                            </div>

                                            <div className="space-y-6">
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Refleksi Perkembangan Belajar</label>
                                                {(assignment.instrument_config?.reflection_prompts || []).map((prompt: string, idx: number) => (
                                                    <div key={idx} className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 border-slate-100 bg-white dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md shadow-none space-y-3">
                                                        <div className="flex items-start gap-3">
                                                            <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed">{prompt}</p>
                                                        </div>
                                                        <textarea
                                                            rows={3}
                                                            value={portfolioReflections[idx]?.answer || ''}
                                                            disabled={isSummativeLocked}
                                                            onChange={(e) => {
                                                                const newReflections = [...portfolioReflections];
                                                                if (!newReflections[idx]) newReflections[idx] = { question: prompt, answer: '' };
                                                                newReflections[idx].answer = e.target.value;
                                                                setPortfolioReflections(newReflections);
                                                            }}
                                                            placeholder="Tuliskan refleksimu di sini..."
                                                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 border-slate-100 bg-slate-50/30 dark:bg-slate-950/40 bg-slate-50 px-4 py-3 text-xs font-medium focus:border-primary focus:ring-1 focus:ring-primary/15 transition-all text-slate-800 text-foreground placeholder-slate-400 resize-none leading-relaxed disabled:opacity-75 disabled:bg-slate-150 dark:disabled:bg-slate-900/50"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : assignment.instrument_type === 'assignment' ? (
                                        <div className="space-y-8 animate-in fade-in duration-500">
                                            <div className="relative overflow-hidden rounded-xl bg-slate-50 border border-slate-200 dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md dark:border-slate-800 border-slate-100 p-6 shadow-none text-slate-800 text-foreground">
                                                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
                                                <div className="relative flex items-center gap-5">
                                                    <div className="h-11 w-11 rounded-lg bg-primary/10 dark:bg-primary text-primary dark:text-white shadow-none flex items-center justify-center">
                                                        <FileText className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold tracking-[-0.03em] text-lg text-slate-800 text-foreground">Penugasan (Laporan/Studi Kasus)</h3>
                                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Analisis studi kasus dan susun laporan pemecahan masalah</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {assignment.instrument_config?.stimulus && (
                                                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 border-slate-100 bg-white dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md shadow-none">
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Deskripsi Studi Kasus:</p>
                                                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{assignment.instrument_config.stimulus}</p>
                                                </div>
                                            )}

                                            <div className="space-y-3">
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Laporan / Analisis</label>
                                                <textarea
                                                    rows={8}
                                                    value={assignmentData.report_text}
                                                    disabled={isSummativeLocked}
                                                    onChange={(e) => setAssignmentData({ ...assignmentData, report_text: e.target.value })}
                                                    placeholder="Susun laporan analisis studi kasus: Identifikasi Masalah, Analisis, Solusi, dan Kesimpulan..."
                                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 border-slate-100 bg-white dark:bg-slate-950/40 bg-slate-50 px-4 py-3 text-xs font-medium focus:border-primary focus:ring-1 focus:ring-primary/15 transition-all text-slate-800 text-foreground placeholder-slate-400 resize-none leading-relaxed disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-900/50"
                                                />
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Upload File Jawaban</label>
                                                {my_submission?.file_path && (
                                                    <div className="mb-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 bg-slate-50 border border-slate-200 dark:border-slate-800 border-slate-100 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-lg bg-white dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md border border-slate-200 dark:border-slate-800 border-slate-100 flex items-center justify-center text-primary">
                                                                <FileText className="h-6 w-6" />
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="text-[10px] font-bold text-primary uppercase tracking-wider leading-none mb-1">File Terkirim</p>
                                                                <p className="text-xs font-semibold text-slate-550 text-muted-foreground truncate max-w-[200px]">{my_submission.file_path.split('/').pop()}</p>
                                                            </div>
                                                        </div>
                                                        <a 
                                                            href={`/storage/${my_submission.file_path}`} 
                                                            target="_blank"
                                                            className="h-8 px-4 rounded-lg bg-primary text-white text-[10px] font-bold uppercase tracking-wider flex items-center justify-center hover:bg-[#4E5BBF] transition-all"
                                                        >
                                                            Lihat File
                                                        </a>
                                                    </div>
                                                )}
                                                <p className="text-[10px] text-muted-foreground">Format: PDF, DOC, DOCX (Maks 10MB)</p>
                                                <input
                                                    type="file"
                                                    accept=".pdf,.doc,.docx"
                                                    disabled={isSummativeLocked}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0] || null;
                                                        setAssignmentData({ ...assignmentData, file });
                                                    }}
                                                    className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer"
                                                />
                                                {assignmentData.file && (
                                                    <p className="text-[10px] text-emerald-600 font-medium">File dipilih: {assignmentData.file.name}</p>
                                                )}
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Catatan Proses Analisis</label>
                                                <p className="text-[10px] text-muted-foreground">Jelaskan langkah analisis, sumber data, dan metode yang digunakan.</p>
                                                <textarea
                                                    rows={4}
                                                    value={assignmentData.analysis_notes}
                                                    disabled={isSummativeLocked}
                                                    onChange={(e) => setAssignmentData({ ...assignmentData, analysis_notes: e.target.value })}
                                                    placeholder="Langkah analisis: 1. Identifikasi..., 2. Analisis..., 3. Solusi..."
                                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 border-slate-100 bg-white dark:bg-slate-950/40 bg-slate-50 px-4 py-3 text-xs font-medium focus:border-primary focus:ring-1 focus:ring-primary/15 transition-all text-slate-800 text-foreground placeholder-slate-400 resize-none leading-relaxed disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-900/50"
                                                />
                                            </div>
                                        </div>
                                    ) : assignment.instrument_type === 'concept_map' ? (
                                        <div className="space-y-8 animate-in fade-in duration-500">
                                            <div className="p-6 rounded-xl bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30">
                                                <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                                                            <GitBranch className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-black text-foreground uppercase tracking-widest leading-none mb-1">Peta Konsep (Concept Map)</h4>
                                                            <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Topik: {assignment.instrument_config?.central_topic}</p>
                                                        </div>
                                                    </div>

                                                    {/* Toggle for Hybrid Mode */}
                                                    {(assignment.instrument_config?.submission_mode === 'hybrid' || !assignment.instrument_config?.submission_mode) && (
                                                        <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                                                            <button
                                                                type="button"
                                                                onClick={() => setConceptMapSubMode('canvas')}
                                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                                                                    conceptMapSubMode === 'canvas'
                                                                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                                        : 'text-muted-foreground hover:text-foreground'
                                                                }`}
                                                            >
                                                                Kanvas Digital
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setConceptMapSubMode('upload')}
                                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                                                                    conceptMapSubMode === 'upload'
                                                                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                                        : 'text-muted-foreground hover:text-foreground'
                                                                }`}
                                                            >
                                                                Unggah Foto
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground dark:text-muted-foreground font-medium italic leading-relaxed ml-14">
                                                    "{assignment.instrument_config?.instructions}"
                                                </p>
                                            </div>

                                            {conceptMapSubMode === 'canvas' && (
                                                <div className="animate-in fade-in duration-300">
                                                    <ConceptMapCanvas 
                                                        data={conceptMapData} 
                                                        setData={setConceptMapData} 
                                                    />
                                                </div>
                                            )}

                                            {conceptMapSubMode === 'upload' && (
                                                <div className="animate-in fade-in duration-300 space-y-4 p-8 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/20 text-center flex flex-col items-center justify-center">
                                                    <div className="h-16 w-16 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-4">
                                                        <ImageIcon className="h-8 w-8" />
                                                    </div>
                                                    <h5 className="text-sm font-bold text-foreground">Unggah Foto Peta Konsep Anda</h5>
                                                    <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
                                                        Silakan gambar peta konsep Anda secara manual di kertas karton, buku tulis, atau aplikasi eksternal (Canva/XMind). Ambil foto atau ekspor sebagai gambar (JPG, PNG) lalu lampirkan pada area berkas di bawah.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : assignment.instrument_type === 'reflective_journal' ? (
                                        <div className="space-y-8 animate-in fade-in duration-500">
                                            <div className="relative overflow-hidden rounded-xl bg-slate-50 border border-slate-200 dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md dark:border-slate-800 border-slate-100 p-6 shadow-none text-slate-800 text-foreground">
                                                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
                                                <div className="relative flex items-center gap-5">
                                                    <div className="h-11 w-11 rounded-lg bg-primary/10 dark:bg-primary text-primary dark:text-white shadow-none flex items-center justify-center">
                                                        <BookOpen className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold tracking-[-0.03em] text-lg text-slate-800 text-foreground">Jurnal Reflektif</h3>
                                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Tuliskan refleksi pribadimu tentang proses belajar hari ini</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                {(assignment.instrument_config?.questions || []).map((q: any, idx: number) => (
                                                    <div key={idx} className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 border-slate-100 bg-white dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md shadow-none space-y-3">
                                                        <div className="flex items-start gap-3">
                                                            <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed">{q.text}</p>
                                                        </div>
                                                        <textarea
                                                            rows={4}
                                                            value={journalAnswers[idx]?.answer || ''}
                                                            disabled={isSummativeLocked}
                                                            onChange={(e) => {
                                                                const newAnswers = [...journalAnswers];
                                                                if (!newAnswers[idx]) newAnswers[idx] = { question: q.text, answer: '' };
                                                                newAnswers[idx].answer = e.target.value;
                                                                setJournalAnswers(newAnswers);
                                                            }}
                                                            placeholder="Tuliskan refleksimu di sini..."
                                                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 border-slate-100 bg-slate-50/30 dark:bg-slate-950/40 bg-slate-50 px-4 py-3 text-xs font-medium focus:border-primary focus:ring-1 focus:ring-primary/15 transition-all text-slate-800 text-foreground placeholder-slate-400 resize-none leading-relaxed disabled:opacity-75 disabled:bg-slate-150 dark:disabled:bg-slate-900/50"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 animate-in fade-in duration-500">
                                            <div className="space-y-3">
                                                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">Teks Jawaban / Laporan</label>
                                                <textarea 
                                                    rows={8}
                                                    placeholder="Tuliskan jawaban, penjelasan, atau laporan Anda di sini secara lengkap..."
                                                    value={studentForm.data.content}
                                                    disabled={isSummativeLocked}
                                                    onChange={(e) => studentForm.setData('content', e.target.value)}
                                                    className="w-full rounded-xl border border-slate-100 bg-slate-50/30 px-8 py-6 text-sm font-medium outline-none focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-50 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-200 transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {(![
                                        'structured_assignment', 
                                        'project', 
                                        'assignment', 
                                        'portfolio',
                                        'formative_quiz',
                                        'exit_ticket',
                                        'peer_assessment',
                                        'self_assessment',
                                        'reflective_journal',
                                        'guided_discussion',
                                        'quiz_survey'
                                    ].includes(assignment.instrument_type) || (assignment.instrument_type === 'concept_map' && conceptMapSubMode === 'upload')) && (
                                        <div className="space-y-4">
                                            <label className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                <Upload className="h-4 w-4" /> Lampiran File (Opsional)
                                            </label>
                                            <div className="relative group">
                                                {my_submission?.file_path && (
                                                    <div className="mb-4 p-4 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/30 flex items-center justify-between group/file">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-primary shadow-sm border border-sky-100 dark:border-sky-800">
                                                                <FileText className="h-6 w-6" />
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">File Terkirim</p>
                                                                <p className="text-xs font-bold text-muted-foreground truncate max-w-[200px]">{my_submission.file_path.split('/').pop()}</p>
                                                            </div>
                                                        </div>
                                                        <a 
                                                            href={`/storage/${my_submission.file_path}`} 
                                                            target="_blank"
                                                            className="h-8 px-4 rounded-lg bg-sky-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center hover:bg-sky-600 transition-all shadow-lg shadow-sky-200 dark:shadow-none"
                                                        >
                                                            Lihat File
                                                        </a>
                                                    </div>
                                                )}
                                                <div className="flex flex-col md:flex-row gap-4 mb-4">
                                                    <label className={`flex flex-1 items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${studentForm.data.is_offline_submission ? 'border-sky-500 bg-sky-50/30' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                                                        <input 
                                                            type="checkbox" 
                                                            className="w-5 h-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                                            checked={studentForm.data.is_offline_submission}
                                                            onChange={(e) => studentForm.setData('is_offline_submission', e.target.checked)}
                                                            disabled={isSummativeLocked}
                                                        />
                                                        <div>
                                                            <p className="font-bold text-sm text-slate-800">Tugas diserahkan langsung ke guru di kelas</p>
                                                            <p className="text-xs text-slate-500">Centang ini jika Anda membuat karya fisik (poster, kerajinan) dan tidak mengunggah file.</p>
                                                        </div>
                                                    </label>

                                                    <div className="relative flex-1">
                                                        <button 
                                                            type="button" 
                                                            className="w-full h-full flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400 transition-all text-slate-600"
                                                            disabled={isSummativeLocked}
                                                        >
                                                            <Camera className="h-6 w-6 mb-2 text-slate-400" />
                                                            <span className="font-bold text-sm">Ambil Foto Bukti Fisik</span>
                                                            <span className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">Gunakan Kamera HP</span>
                                                        </button>
                                                        <input 
                                                            type="file"
                                                            accept="image/*"
                                                            capture="environment"
                                                            disabled={isSummativeLocked}
                                                            onChange={(e) => {
                                                                if(e.target.files && e.target.files[0]) {
                                                                    studentForm.setData('file', e.target.files[0]);
                                                                    studentForm.setData('is_offline_submission', false);
                                                                }
                                                            }}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                        />
                                                    </div>
                                                </div>

                                                {!studentForm.data.is_offline_submission && (
                                                    <div className={`w-full rounded-xl border-2 border-dashed border-border bg-slate-50/20 px-8 py-12 text-center transition-all relative ${isSummativeLocked ? 'pointer-events-none opacity-60' : 'group-hover:border-sky-400 group-hover:bg-sky-50/10 cursor-pointer'}`}>
                                                        <div className="h-12 w-12 rounded-xl bg-white dark:bg-slate-900 border border-border flex items-center justify-center mx-auto mb-4 text-muted-foreground group-hover:text-primary transition-colors shadow-sm">
                                                            <Upload className="h-6 w-6" />
                                                        </div>
                                                        <p className="text-sm font-bold text-slate-600 dark:text-muted-foreground">
                                                            {studentForm.data.file ? studentForm.data.file.name : 'Klik atau seret file ke sini untuk mengganti/unggah file baru'}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2">Maks. 10MB (PDF, DOC, Gambar)</p>
                                                        <input 
                                                            type="file"
                                                            disabled={isSummativeLocked}
                                                            onChange={(e) => studentForm.setData('file', e.target.files ? e.target.files[0] : null)}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <button 
                                        type="submit"
                                        disabled={isSubmitting || isSummativeLocked}
                                        className={`w-full ${
                                            (assignment.instrument_type === 'formative_quiz' || assignment.instrument_type === 'exit_ticket')
                                                ? 'rounded-lg bg-primary hover:bg-[#4E5BBF] shadow-none py-4 text-xs font-semibold'
                                                : 'rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 shadow-sky-200 py-5 text-sm font-black'
                                        } text-white shadow-2xl dark:shadow-none hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest`}
                                    >
                                        {my_submission ? (my_submission.is_remedial_open ? 'Kirim Jawaban Remedial' : 'Perbarui Jawaban') : 'Kirim Jawaban Sekarang'}
                                    </button>
                                    </fieldset>
                                </form>
                            </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div className={(assignment.instrument_type === 'formative_quiz' || assignment.instrument_type === 'exit_ticket')
                                ? "rounded-xl border border-slate-200 dark:border-slate-800 border-slate-100 bg-white dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md p-6 shadow-none"
                                : "rounded-xl border border-border bg-white dark:bg-slate-900 p-8 shadow-sm"
                            }>
                                <h2 className={`text-xs font-black text-foreground uppercase tracking-widest mb-6 border-b pb-4 ${
                                    (assignment.instrument_type === 'formative_quiz' || assignment.instrument_type === 'exit_ticket')
                                        ? 'border-slate-100 dark:border-slate-800 border-slate-100'
                                        : 'border-slate-50 dark:border-slate-800'
                                }`}>Status Pengumpulan</h2>
                                {my_submission ? (
                                    <>
                                        <div className="space-y-6">
                                            {my_submission.is_remedial_open && (
                                                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold leading-relaxed flex items-start gap-2">
                                                    <RotateCcw className="h-4 w-4 shrink-0 mt-0.5" />
                                                    <span>Kesempatan remedial dibuka oleh guru. Silakan kerjakan kembali kuis di sebelah kiri dan kirim jawaban baru.</span>
                                                </div>
                                            )}
                                            <div className={`flex items-center gap-4 p-5 border ${
                                                (assignment.instrument_type === 'formative_quiz' || assignment.instrument_type === 'exit_ticket')
                                                    ? 'rounded-xl bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-950/20 dark:border-emerald-900/30'
                                                    : 'rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30'
                                            }`}>
                                                <div className={`h-10 w-10 flex items-center justify-center text-white ${
                                                    (assignment.instrument_type === 'formative_quiz' || assignment.instrument_type === 'exit_ticket')
                                                        ? 'rounded-lg bg-emerald-500 shadow-none'
                                                        : 'rounded-xl bg-emerald-500 shadow-lg shadow-emerald-200'
                                                }`}>
                                                    <CheckCircle2 className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest">Selesai Dikirim</p>
                                                        {my_submission.attempts > 1 && (
                                                            <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-[8px] font-bold text-warning italic">({my_submission.attempts}x remedial)</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs font-bold text-emerald-600/70">{my_submission.submitted_at}</p>
                                                </div>
                                            </div>
                                            
                                            {['reflective_journal', 'self_assessment', 'peer_assessment', 'exit_ticket'].includes(assignment.instrument_type) ? (
                                                <div className="space-y-3">
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                                        {assignment.instrument_type === 'reflective_journal' ? 'Capaian Refleksi (KKTP):' :
                                                         assignment.instrument_type === 'exit_ticket' ? 'Capaian Tiket Keluar (KKTP):' :
                                                         assignment.instrument_type === 'self_assessment' ? 'Capaian Penilaian Diri (KKTP):' :
                                                         'Capaian Penilaian Sejawat (KKTP):'}
                                                    </p>
                                                    <div className="flex items-end gap-2">
                                                        <span className={`text-2xl font-black tracking-tight ${my_submission?.score !== null ? 'text-foreground' : 'text-slate-300'}`}>
                                                            {(() => {
                                                                if (my_submission?.score === null || my_submission?.score === undefined) return 'Belum Dinilai';
                                                                try {
                                                                    const parsed = JSON.parse(my_submission.content || '{}');
                                                                    if (parsed.grading?.selected_level) {
                                                                        return parsed.grading.selected_level;
                                                                    }
                                                                    return checkIsKKTPPassed(my_submission, assignment, displayScore) ? 'Tuntas' : 'Belum Tuntas';
                                                                } catch(e) {
                                                                    return checkIsKKTPPassed(my_submission, assignment, displayScore) ? 'Tuntas' : 'Belum Tuntas';
                                                                }
                                                            })()}
                                                        </span>
                                                    </div>
                                                    {my_submission?.score !== null && my_submission?.score !== undefined && (
                                                        <div className="pt-2">
                                                            {(() => {
                                                                const isPassed = checkIsKKTPPassed(my_submission, assignment, displayScore);
                                                                return isPassed ? (
                                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-white text-[9px] font-black uppercase tracking-widest rounded-lg bg-emerald-500 shadow-sm">
                                                                        <CheckCircle2 className="h-3 w-3" /> Tuntas
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-white text-[9px] font-black uppercase tracking-widest rounded-lg bg-rose-500 shadow-sm">
                                                                        <AlertCircle className="h-3 w-3" /> Belum Tuntas
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pencapaian:</p>
                                                    <div className="flex items-end gap-2">
                                                        <span className={`text-5xl font-black tracking-tighter ${displayScore !== null ? 'text-foreground' : 'text-slate-300'}`}>
                                                            {displayScore ?? '-'}
                                                        </span>
                                                        <span className="text-sm font-black text-muted-foreground mb-2 uppercase">/ {assignment.max_points} pts</span>
                                                    </div>
                                                    {displayScore !== null && (
                                                        <div className="pt-2">
                                                            {(() => {
                                                                const effectivePassed = checkIsKKTPPassed(my_submission, assignment, displayScore);
                                                                
                                                                return effectivePassed ? (
                                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-white text-[9px] font-black uppercase tracking-widest ${
                                                                        (assignment.instrument_type === 'formative_quiz' || assignment.instrument_type === 'exit_ticket')
                                                                            ? 'rounded-[4px] bg-emerald-500 shadow-none'
                                                                            : 'rounded-lg bg-emerald-500 shadow-sm'
                                                                    }`}>
                                                                        <CheckCircle2 className="h-3 w-3" /> Tuntas
                                                                    </span>
                                                                ) : (
                                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-white text-[9px] font-black uppercase tracking-widest ${
                                                                        (assignment.instrument_type === 'formative_quiz' || assignment.instrument_type === 'exit_ticket')
                                                                            ? 'rounded-[4px] bg-rose-500 shadow-none'
                                                                            : 'rounded-lg bg-rose-500 shadow-sm'
                                                                    }`}>
                                                                        <AlertCircle className="h-3 w-3" /> Remedial
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                     {my_submission?.remedial_history && my_submission.remedial_history.length > 0 && (
                                                         <div className="pt-4 border-t border-slate-100 dark:border-slate-800 border-slate-100 text-left space-y-2">
                                                             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Riwayat Remedial:</p>
                                                             <div className="space-y-1 bg-slate-50 dark:bg-slate-950/40 bg-slate-50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                                                                 {my_submission.remedial_history.map((hist: any, hIdx: number) => (
                                                                     <div key={hIdx} className="text-[10px] text-muted-foreground flex justify-between">
                                                                         <span>Percobaan {hist.attempt}:</span>
                                                                         <span className="font-bold text-foreground">{hist.score} / {assignment.max_points}</span>
                                                                     </div>
                                                                 ))}
                                                             </div>
                                                         </div>
                                                     )}
                                                     {displayScore === null && (
                                                         <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest animate-pulse">Menunggu Penilaian Guru</p>
                                                     )}

                                                     {/* Formative Self-Remedial Button */}
                                                     {assignment.assessment_type === 'formative' && (
                                                         <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                                             <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Remedial Mandiri (Formatif):</p>
                                                             <button
                                                                 type="button"
                                                                 onClick={() => {
                                                                     setIsRetryActive(true);
                                                                     studentForm.setData('answers', {});
                                                                 }}
                                                                 className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition shadow-sm cursor-pointer"
                                                             >
                                                                 <RotateCcw className="h-3.5 w-3.5" />
                                                                 <span>Kerjakan Ulang Soal</span>
                                                             </button>
                                                             <p className="text-[10px] text-muted-foreground text-center">
                                                                 Setelah melihat pembahasan, Anda dapat langsung mengulang latihan mandiri untuk memperdalam pemahaman.
                                                             </p>
                                                         </div>
                                                     )}
                                                </div>
                                            )}

                                            {displayScore !== null && assignment.assessment_type === 'initial' && (
                                                <div className="pt-6 border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-4 duration-500">
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Rekomendasi Tindak Lanjut:</p>
                                                    {Number(displayScore) >= Number(assignment.instrument_config?.pass_threshold || 60) ? (
                                                        <div className={`p-6 border space-y-4 ${
                                                            (assignment.instrument_type === 'formative_quiz' || assignment.instrument_type === 'exit_ticket')
                                                                ? 'rounded-xl bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-950/20 dark:border-emerald-900/30'
                                                                : 'rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30'
                                                        }`}>
                                                            <div className="flex items-center gap-3">
                                                                <div className={`h-6 w-6 flex items-center justify-center text-white ${
                                                                    (assignment.instrument_type === 'formative_quiz' || assignment.instrument_type === 'exit_ticket')
                                                                        ? 'rounded-[4px] bg-emerald-500 shadow-none'
                                                                        : 'rounded-lg bg-emerald-500 shadow-sm'
                                                                }`}>
                                                                    <Star className="h-3.5 w-3.5" />
                                                                </div>
                                                                <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Kategori: Siap / Cakap</span>
                                                            </div>
                                                            <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed font-bold italic">
                                                                "{assignment.instrument_config?.follow_up_high || 'Murid dapat langsung mengikuti materi baru atau diberikan tantangan pengayaan.'}"
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className={`p-6 border space-y-4 ${
                                                            (assignment.instrument_type === 'formative_quiz' || assignment.instrument_type === 'exit_ticket')
                                                                ? 'rounded-xl bg-rose-500/10 border-rose-500/20 dark:bg-rose-950/20 dark:border-rose-900/30'
                                                                : 'rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30'
                                                        }`}>
                                                            <div className="flex items-center gap-3">
                                                                <div className={`h-6 w-6 flex items-center justify-center text-white ${
                                                                    (assignment.instrument_type === 'formative_quiz' || assignment.instrument_type === 'exit_ticket')
                                                                        ? 'rounded-[4px] bg-rose-500 shadow-none'
                                                                        : 'rounded-lg bg-rose-500 shadow-sm'
                                                                }`}>
                                                                    <Info className="h-3.5 w-3.5" />
                                                                </div>
                                                                <span className="text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest">Kategori: Perlu Bimbingan</span>
                                                            </div>
                                                            <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed font-bold italic">
                                                                "{assignment.instrument_config?.follow_up_low || 'Pendidik memberikan pendampingan khusus atau mengulang sekilas materi prasyarat.'}"
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {my_submission.feedback && (
                                                <div className="pt-6 border-t border-slate-50 dark:border-slate-800">
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Umpan Balik Guru:</p>
                                                    <div className={`p-5 border ${
                                                        (assignment.instrument_type === 'formative_quiz' || assignment.instrument_type === 'exit_ticket')
                                                            ? 'rounded-xl bg-slate-50 dark:bg-slate-950/40 bg-slate-50 border-slate-200 dark:border-slate-800 border-slate-100'
                                                            : 'rounded-xl bg-muted/50 border border-border'
                                                    }`}>
                                                        <p className="text-xs text-slate-600 dark:text-slate-300 italic font-medium leading-relaxed">
                                                            "{my_submission.feedback}"
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {assignment.instrument_type === 'observation_checklist' && (
                                            <div className="pt-6 border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-4">
                                                <div className="flex items-center gap-2 mb-6">
                                                    <Activity className="h-4 w-4 text-primary" />
                                                    <h3 className="text-xs font-black text-foreground uppercase tracking-widest">Hasil Observasi Anda</h3>
                                                </div>
                                                {(() => {
                                                    try {
                                                        const p = JSON.parse(my_submission.content);
                                                        if (p.type === 'observation') {
                                                            return (
                                                                <div className="space-y-6">
                                                                    <div className="grid gap-3">
                                                                        {(assignment.instrument_config?.indicators || []).map((ind: any, idx: number) => {
                                                                            const indKey = ind.id || ind.name || ind.text || idx.toString();
                                                                            return (
                                                                                <div key={indKey} className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
                                                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{ind.text || ind.name}</span>
                                                                                    {p.checklist[indKey] === true ? (
                                                                                        <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest shadow-sm">Muncul</span>
                                                                                    ) : (
                                                                                        <span className="px-3 py-1 rounded-full bg-slate-200 text-muted-foreground text-[8px] font-black uppercase tracking-widest">Belum</span>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    {p.note && (
                                                                        <div className="p-5 rounded-xl bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30">
                                                                            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2">Catatan Guru:</p>
                                                                            <p className="text-xs text-slate-600 dark:text-slate-300 italic font-medium leading-relaxed">"{p.note}"</p>
                                                                        </div>
                                                                    )}
                                                                    {p.action_plan && (
                                                                        <div className="p-5 rounded-xl bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30">
                                                                            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2">Strategi Pengembangan:</p>
                                                                            <p className="text-xs text-emerald-700 dark:text-emerald-300 font-bold leading-relaxed italic">"{p.action_plan}"</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        }
                                                    } catch(e) {}
                                                    return null;
                                                })()}
                                            </div>
                                        )}

                                        {assignment.instrument_type === 'rubric' && (
                                            <div className="pt-6 border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-4">
                                                <div className="flex items-center gap-2 mb-6">
                                                    <ListChecks className="h-4 w-4 text-amber-500" />
                                                    <h3 className="text-xs font-black text-foreground uppercase tracking-widest">Capaian Kinerja Anda</h3>
                                                </div>
                                                {(() => {
                                                    try {
                                                        const p = JSON.parse(my_submission.content);
                                                        if (p.type === 'rubric') {
                                                            return (
                                                                <div className="space-y-6">
                                                                    {(assignment.instrument_config?.criteria || []).map((criterion: any) => {
                                                                        const achievedLevelId = p.scores[criterion.id];
                                                                        const level = (assignment.instrument_config?.levels || []).find((l: any) => l.id === achievedLevelId);
                                                                        return (
                                                                            <div key={criterion.id} className="space-y-3">
                                                                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-4">{criterion.text}</p>
                                                                                {level ? (
                                                                                    <div className="p-5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 shadow-sm transition-all hover:scale-[1.01]">
                                                                                        <div className="flex items-center justify-between mb-2">
                                                                                            <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest shadow-sm">{level.name}</span>
                                                                                            <CheckCircle2 className="h-4 w-4 text-amber-500" />
                                                                                        </div>
                                                                                        <p className="text-xs text-slate-700 dark:text-slate-200 font-bold leading-relaxed italic">
                                                                                            "{criterion.descriptions[level.id] || 'Luar biasa, Anda telah mencapai level ini.'}"
                                                                                        </p>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="p-4 rounded-xl bg-muted/50 border border-border italic text-[10px] text-muted-foreground font-bold text-center">
                                                                                        Belum dinilai oleh pengajar.
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            );
                                                        }
                                                    } catch(e) {}
                                                    return null;
                                                })()}
                                            </div>
                                        )}

                                        {assignment.instrument_type === 'anecdotal_notes' && (
                                            <div className="pt-6 border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-4">
                                                <div className="flex items-center gap-2 mb-6">
                                                    <FileText className="h-4 w-4 text-indigo-500" />
                                                    <h3 className="text-xs font-black text-foreground uppercase tracking-widest">Detail Catatan Anekdotal</h3>
                                                </div>
                                                {(() => {
                                                    try {
                                                        const p = JSON.parse(my_submission.content);
                                                        if (p.type === 'anecdotal') {
                                                            return (
                                                                <div className="space-y-6">
                                                                    <div className="flex flex-wrap gap-3">
                                                                        <div className="px-4 py-2 rounded-xl bg-muted border border-slate-100 dark:border-slate-700">
                                                                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Tanggal</p>
                                                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{p.date}</p>
                                                                        </div>
                                                                        {p.time && (
                                                                            <div className="px-4 py-2 rounded-xl bg-muted border border-slate-100 dark:border-slate-700">
                                                                                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Waktu</p>
                                                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{p.time}</p>
                                                                            </div>
                                                                        )}
                                                                        {p.location && (
                                                                            <div className="px-4 py-2 rounded-xl bg-muted border border-slate-100 dark:border-slate-700">
                                                                                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Lokasi</p>
                                                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{p.location}</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {p.context && (
                                                                        <div className="p-5 rounded-xl bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30">
                                                                            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2">Konteks Kejadian:</p>
                                                                            <p className="text-xs text-slate-600 dark:text-slate-300 font-bold leading-relaxed">{p.context}</p>
                                                                        </div>
                                                                    )}
                                                                    <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                                                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Deskripsi Peristiwa:</p>
                                                                        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed italic">"{p.event_description}"</p>
                                                                    </div>
                                                                    <div className="p-5 rounded-xl bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30">
                                                                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2">Analisis & Tindak Lanjut:</p>
                                                                        <p className="text-xs text-emerald-700 dark:text-emerald-300 font-bold leading-relaxed italic">"{p.analysis_followup}"</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                    } catch(e) {}
                                                    return null;
                                                })()}
                                            </div>
                                        )}

                                        {assignment.instrument_type === 'self_assessment' && (
                                            <div className="pt-6 border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-4">
                                                <div className="flex items-center gap-2 mb-6">
                                                    <UserCheck className="h-4 w-4 text-amber-500" />
                                                    <h3 className="text-xs font-black text-foreground uppercase tracking-widest">
                                                        {(() => {
                                                            try {
                                                                const p = JSON.parse(my_submission.content || '{}');
                                                                if (p.assessment_mode === 'checklist' || p.assessment_mode === 'simple_rubric') {
                                                                    return 'Hasil Penilaian Diri Anda';
                                                                }
                                                            } catch(e) {}
                                                            return 'Refleksi Anda';
                                                        })()}
                                                    </h3>
                                                </div>
                                                {(() => {
                                                    try {
                                                        const p = JSON.parse(my_submission.content);
                                                        if (p.type === 'self_assessment') {
                                                            if (p.assessment_mode === 'checklist') {
                                                                return (
                                                                    <div className="space-y-4">
                                                                        <div className="p-5 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/15 border border-indigo-100/60 dark:border-indigo-900/35 space-y-3">
                                                                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1">Daftar Indikator Penilaian Diri</p>
                                                                            <div className="space-y-3">
                                                                                {(p.indicators || []).map((ind: any, idx: number) => (
                                                                                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-200">
                                                                                        {ind.checked ? (
                                                                                            <CheckSquare className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                                                                                        ) : (
                                                                                            <Square className="h-4 w-4 text-slate-300 dark:text-slate-600 mt-0.5 shrink-0" />
                                                                                        )}
                                                                                        <div>
                                                                                            <p className="font-bold text-slate-700 dark:text-slate-200">{ind.name}</p>
                                                                                            <p className="text-[9px] text-muted-foreground font-medium mt-0.5">{ind.checked ? 'Dicapai' : 'Belum Dicapai'}</p>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }

                                                            if (p.assessment_mode === 'simple_rubric') {
                                                                return (
                                                                    <div className="space-y-4">
                                                                        <div className="p-5 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/15 border border-indigo-100/60 dark:border-indigo-900/35 space-y-3">
                                                                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1">Kriteria Capaian Penilaian Diri</p>
                                                                            <div className="space-y-4">
                                                                                {(p.indicators || []).map((ind: any, idx: number) => (
                                                                                    <div key={idx} className="border-b border-indigo-100/30 dark:border-indigo-900/20 pb-3 last:border-0 last:pb-0">
                                                                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{ind.name}</p>
                                                                                        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider">
                                                                                            <Zap className="h-3 w-3" /> {ind.selected_level || 'Belum Memilih'}
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }

                                                            const feelingMap: any = {
                                                                very_happy: { label: 'Sangat Senang', icon: '🤩' },
                                                                happy: { label: 'Senang', icon: '😊' },
                                                                neutral: { label: 'Kurang Senang', icon: '😐' },
                                                            };
                                                            return (
                                                                <div className="space-y-6">
                                                                    <div className="flex flex-wrap gap-3">
                                                                        <div className="px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 flex items-center gap-2">
                                                                            <span className="text-xl">{feelingMap[p.feeling]?.icon}</span>
                                                                            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">{feelingMap[p.feeling]?.label || 'Biasa Saja'}</p>
                                                                        </div>
                                                                        <div className="px-4 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30">
                                                                            <p className="text-[8px] font-black text-sky-400 uppercase tracking-widest">Skala Usaha</p>
                                                                            <p className="text-xs font-bold text-sky-700 dark:text-sky-400">{p.effort_scale} / 4</p>
                                                                        </div>
                                                                    </div>
                                                                    {p.feeling_reason && (
                                                                        <div className="p-5 rounded-xl bg-muted/50 border border-border">
                                                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Alasan Perasaan:</p>
                                                                            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed italic">"{p.feeling_reason}"</p>
                                                                        </div>
                                                                    )}
                                                                    <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                                                                        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2">Catatan Refleksi:</p>
                                                                        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-bold">"{p.reflection_notes}"</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                    } catch(e) {}
                                                    return null;
                                                })()}
                                            </div>
                                        )}

                                        {assignment.instrument_type === 'peer_assessment' && (
                                            <div className="pt-6 border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-4">
                                                <div className="flex items-center gap-2 mb-6">
                                                    <Users className="h-4 w-4 text-indigo-500" />
                                                    <h3 className="text-xs font-black text-foreground uppercase tracking-widest">
                                                        {(() => {
                                                            try {
                                                                const p = JSON.parse(my_submission.content || '{}');
                                                                if (p.assessment_mode === 'checklist' || p.assessment_mode === 'simple_rubric') {
                                                                    return 'Hasil Penilaian Antarteman';
                                                                }
                                                            } catch(e) {}
                                                            return 'Penilaian Teman Anda';
                                                        })()}
                                                    </h3>
                                                </div>
                                                {(() => {
                                                    try {
                                                        const p = JSON.parse(my_submission.content);
                                                        if (p.type === 'peer_assessment') {
                                                            if (p.assessment_mode === 'checklist') {
                                                                return (
                                                                    <div className="space-y-4">
                                                                        <div className="p-4 rounded-xl bg-muted border border-slate-100 dark:border-slate-700 mb-4">
                                                                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">Teman yang Dinilai:</p>
                                                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{p.peer_name}</p>
                                                                        </div>
                                                                        <div className="p-5 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/15 border border-indigo-100/60 dark:border-indigo-900/35 space-y-3">
                                                                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1">Daftar Indikator Penilaian</p>
                                                                            <div className="space-y-3">
                                                                                {(p.indicators || []).map((ind: any, idx: number) => (
                                                                                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-200">
                                                                                        {ind.checked ? (
                                                                                            <CheckSquare className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                                                                                        ) : (
                                                                                            <Square className="h-4 w-4 text-slate-300 dark:text-slate-600 mt-0.5 shrink-0" />
                                                                                        )}
                                                                                        <div>
                                                                                            <p className="font-bold text-slate-700 dark:text-slate-200">{ind.name}</p>
                                                                                            <p className="text-[9px] text-muted-foreground font-medium mt-0.5">{ind.checked ? 'Dicapai' : 'Belum Dicapai'}</p>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }

                                                            if (p.assessment_mode === 'simple_rubric') {
                                                                return (
                                                                    <div className="space-y-4">
                                                                        <div className="p-4 rounded-xl bg-muted border border-slate-100 dark:border-slate-700 mb-4">
                                                                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">Teman yang Dinilai:</p>
                                                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{p.peer_name}</p>
                                                                        </div>
                                                                        <div className="p-5 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/15 border border-indigo-100/60 dark:border-indigo-900/35 space-y-3">
                                                                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1">Kriteria Capaian Penilaian</p>
                                                                            <div className="space-y-4">
                                                                                {(p.indicators || []).map((ind: any, idx: number) => (
                                                                                    <div key={idx} className="border-b border-indigo-100/30 dark:border-indigo-900/20 pb-3 last:border-0 last:pb-0">
                                                                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{ind.name}</p>
                                                                                        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider">
                                                                                            <Zap className="h-3 w-3" /> {ind.selected_level || 'Belum Memilih'}
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }

                                                            return (
                                                                <div className="space-y-6">
                                                                    <div className="p-4 rounded-xl bg-muted border border-slate-100 dark:border-slate-700">
                                                                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">Teman yang Dinilai:</p>
                                                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{p.peer_name}</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        {[1, 2, 3, 4, 5].map((s) => (
                                                                            <Star key={s} className={`h-4 w-4 ${p.rating >= s ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-700'}`} />
                                                                        ))}
                                                                        <span className="text-xs font-black text-muted-foreground ml-2">{p.rating} / 5</span>
                                                                    </div>
                                                                    <div className="grid gap-3">
                                                                        <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                                                                            <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Terbaik di Kelompok:</p>
                                                                            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{p.best_performer}</p>
                                                                        </div>
                                                                        <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
                                                                            <p className="text-[8px] font-black text-rose-600 uppercase tracking-widest mb-1">Perlu Peningkatan:</p>
                                                                            <p className="text-xs font-bold text-rose-700 dark:text-rose-300">{p.worst_performer}</p>
                                                                        </div>
                                                                    </div>
                                                                    {p.obstacles && (
                                                                        <div className="p-5 rounded-xl bg-muted/50 border border-border">
                                                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Kendala Kelompok:</p>
                                                                            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium italic">{p.obstacles}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        }
                                                    } catch(e) {}
                                                    return null;
                                                })()}
                                            </div>
                                        )}

                                        {assignment.instrument_type === 'structured_assignment' && (
                                            <div className="pt-6 border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-4">
                                                <div className="flex items-center gap-2 mb-6">
                                                    <FileText className="h-4 w-4 text-primary" />
                                                    <h3 className="text-xs font-black text-foreground uppercase tracking-widest">Hasil Penugasan Terstruktur</h3>
                                                </div>
                                                {(() => {
                                                    try {
                                                        const p = JSON.parse(my_submission.content);
                                                        if (p.type !== 'structured_assignment') return null;
                                                        return (
                                                            <div className="space-y-4">
                                                                {p.answer_text && (
                                                                    <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950/40 bg-slate-50 border border-slate-200 dark:border-slate-800 border-slate-100">
                                                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Jawaban Teks:</p>
                                                                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">{p.answer_text}</p>
                                                                    </div>
                                                                )}
                                                                {my_submission.file_path && (
                                                                    <a href={`/storage/${my_submission.file_path}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition">
                                                                        <Download className="h-3.5 w-3.5" /> Lihat Lampiran
                                                                    </a>
                                                                )}
                                                            </div>
                                                        );
                                                    } catch { return null; }
                                                })()}
                                             </div>
                                         )}

                                         {assignment.instrument_type === 'exit_ticket' && (
                                             <div className="pt-6 border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-4">
                                                 <div className="flex items-center gap-2 mb-6">
                                                     <Ticket className="h-4 w-4 text-emerald-500" />
                                                     <h3 className="text-xs font-black text-foreground uppercase tracking-widest">Detail Jawaban Exit Ticket Anda</h3>
                                                 </div>
                                                 {(() => {
                                                     try {
                                                         const parsed = JSON.parse(my_submission.content);
                                                         if (parsed.type !== 'exit_ticket') return null;
                                                         const assessmentMode = parsed.assessment_mode || 'default';
                                                         if (assessmentMode === 'checklist') {
                                                             return (
                                                                 <div className="space-y-4">
                                                                     <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Ceklis Pemahaman</p>
                                                                     {(parsed.indicators || []).map((ind: any, idx: number) => (
                                                                         <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                                                                             {ind.checked ? <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" /> : <Square className="h-4 w-4 text-muted-foreground/30 shrink-0" />}
                                                                             <span className={`text-xs font-medium ${ind.checked ? 'text-foreground' : 'text-muted-foreground'}`}>{ind.name}</span>
                                                                         </div>
                                                                     ))}
                                                                 </div>
                                                             );
                                                         }
                                                         if (assessmentMode === 'short_note') {
                                                             return (
                                                                 <div className="space-y-4">
                                                                     <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Catatan Singkat</p>
                                                                     {(parsed.answers || []).map((ans: any, idx: number) => (
                                                                         <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 bg-slate-50 border border-slate-200 dark:border-slate-800 border-slate-100 space-y-1">
                                                                             <p className="text-[10px] font-black text-primary uppercase tracking-widest">{ans.text || `Pertanyaan ${idx + 1}`}</p>
                                                                             <p className="text-sm font-semibold text-foreground whitespace-pre-wrap">{ans.answer || '-'}</p>
                                                                         </div>
                                                                     ))}
                                                                 </div>
                                                             );
                                                         }
                                                         
                                                         const feelingMap: any = {
                                                             paham: { label: 'Paham', icon: '😊', color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30' },
                                                             ragu: { label: 'Ragu-Ragu', icon: '😐', color: 'text-amber-700 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30' },
                                                             bingung: { label: 'Bingung', icon: '🙁', color: 'text-rose-700 bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30' },
                                                         };
                                                         const emoji = parsed.answers?.emoji;
                                                         const feeling = feelingMap[emoji];
                                                         return (
                                                             <div className="space-y-6">
                                                                 <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Form Standar</p>
                                                                 {feeling && (
                                                                     <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 w-fit ${feeling.color}`}>
                                                                         <span className="text-xl">{feeling.icon}</span>
                                                                         <p className="text-xs font-bold">{feeling.label}</p>
                                                                     </div>
                                                                 )}
                                                                 {Array.isArray(parsed.answers?.reflection_answers) && parsed.answers.reflection_answers.length > 0 ? (
                                                                     <div className="space-y-4">
                                                                         {parsed.answers.reflection_answers.map((ans: any, idx: number) => (
                                                                             <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 bg-slate-50 border border-slate-200 dark:border-slate-800 border-slate-100 space-y-1">
                                                                                 <p className="text-[10px] font-black text-primary uppercase tracking-widest">{ans.question || `Pertanyaan ${idx + 1}`}</p>
                                                                                 <p className="text-sm font-semibold text-foreground whitespace-pre-wrap">{ans.answer || '-'}</p>
                                                                             </div>
                                                                         ))}
                                                                     </div>
                                                                 ) : (
                                                                     <div className="p-5 rounded-xl bg-muted/50 border border-border">
                                                                         <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Catatan Refleksi:</p>
                                                                         <p className="text-xs text-slate-600 dark:text-slate-350 font-medium leading-relaxed italic">"{parsed.answers?.reflection || 'Tidak menuliskan umpan balik teks'}"</p>
                                                                     </div>
                                                                 )}
                                                             </div>
                                                         );
                                                     } catch { return null; }
                                                 })()}
                                             </div>
                                         )}

                                         {assignment.instrument_type === 'reflective_journal' && (
                                            <div className="pt-6 border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-4">
                                                <div className="flex items-center gap-2 mb-6">
                                                    <BookOpen className="h-4 w-4 text-primary" />
                                                    <h3 className="text-xs font-black text-foreground uppercase tracking-widest">Jurnal Reflektif Siswa</h3>
                                                </div>
                                                {(() => {
                                                    try {
                                                        const p = JSON.parse(my_submission.content);
                                                        if (p.type !== 'reflective_journal') return null;
                                                        return (
                                                            <div className="space-y-4">
                                                                {(p.answers || []).map((a: any, idx: number) => (
                                                                    <div key={idx} className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950/40 bg-slate-50 border border-slate-200 dark:border-slate-800 border-slate-100 space-y-2">
                                                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">Pertanyaan {idx + 1}:</p>
                                                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{a.question}</p>
                                                                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 border-slate-100">
                                                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Jawaban:</p>
                                                                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium italic whitespace-pre-wrap">{a.answer || '-'}</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        );
                                                    } catch { return null; }
                                                })()}
                                            </div>
                                        )}

                                        {assignment.instrument_type === 'assignment' && (
                                            <div className="pt-6 border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-4">
                                                <div className="flex items-center gap-2 mb-6">
                                                    <FileText className="h-4 w-4 text-primary" />
                                                    <h3 className="text-xs font-black text-foreground uppercase tracking-widest">Hasil Penugasan (Laporan/Studi Kasus)</h3>
                                                </div>
                                                {(() => {
                                                    try {
                                                        const p = JSON.parse(my_submission.content);
                                                        if (p.type !== 'assignment') return null;
                                                        return (
                                                            <div className="space-y-4">
                                                                {p.report_text && (
                                                                    <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950/40 bg-slate-50 border border-slate-200 dark:border-slate-800 border-slate-100">
                                                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Laporan / Analisis:</p>
                                                                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">{p.report_text}</p>
                                                                    </div>
                                                                )}
                                                                {p.analysis_notes && (
                                                                    <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950/40 bg-slate-50 border border-slate-200 dark:border-slate-800 border-slate-100">
                                                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Catatan Proses Analisis:</p>
                                                                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">{p.analysis_notes}</p>
                                                                    </div>
                                                                )}
                                                                {my_submission.file_path && (
                                                                    <a href={`/storage/${my_submission.file_path}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition">
                                                                        <Download className="h-3.5 w-3.5" /> Lihat File Jawaban
                                                                    </a>
                                                                )}
                                                            </div>
                                                        );
                                                    } catch { return null; }
                                                })()}
                                            </div>
                                        )}

                                        {assignment.instrument_type === 'concept_map' && (
                                            <div className="pt-6 border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-4">
                                                <div className="flex items-center gap-2 mb-6">
                                                    <GitBranch className="h-4 w-4 text-indigo-500" />
                                                    <h3 className="text-xs font-black text-foreground uppercase tracking-widest">Peta Konsep Anda</h3>
                                                </div>
                                                {(() => {
                                                    try {
                                                        const p = JSON.parse(my_submission.content);
                                                        if (p.type === 'concept_map') {
                                                            return (
                                                                <div className="space-y-6">
                                                                    <div className="p-5 rounded-xl bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30">
                                                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1 leading-none">Topik Utama:</p>
                                                                        <p className="text-sm font-black text-foreground">{assignment.instrument_config?.central_topic}</p>
                                                                    </div>
                                                                    {p.submission_type === 'upload' ? (
                                                                        <div className="relative overflow-hidden rounded-xl border border-border bg-slate-50 dark:bg-slate-900 p-6 text-center">
                                                                            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-3 text-left">Foto Peta Konsep Terunggah:</p>
                                                                            {my_submission.file_path ? (
                                                                                <img 
                                                                                    src={`/storage/${my_submission.file_path}`} 
                                                                                    alt="Peta Konsep" 
                                                                                    className="max-h-[500px] w-auto mx-auto rounded-xl object-contain shadow-lg border border-border hover:scale-[1.01] transition-all"
                                                                                />
                                                                            ) : (
                                                                                <p className="text-xs text-muted-foreground italic">File tidak ditemukan.</p>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <ConceptMapCanvas 
                                                                            data={{ nodes: p.nodes || [], edges: p.edges || [] }} 
                                                                            readOnly={true} 
                                                                        />
                                                                    )}
                                                                </div>
                                                            );
                                                        }
                                                    } catch(e) {}
                                                    return null;
                                                })()}
                                            </div>
                                        )}

                                        {(assignment.instrument_type === 'written_test' || assignment.instrument_type === 'formative_quiz') && (
                                            <div className="pt-6 border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-4">
                                                <div className="flex items-center gap-2 mb-6">
                                                    {assignment.instrument_type === 'formative_quiz' ? (
                                                        <ListChecks className="h-4 w-4 text-primary" />
                                                    ) : (
                                                        <Layers className="h-4 w-4 text-rose-500" />
                                                    )}
                                                    <h3 className="text-xs font-black text-foreground uppercase tracking-widest">
                                                        {assignment.instrument_type === 'formative_quiz' ? 'Hasil Tes/Penugasan Singkat' : 'Hasil Tes Tertulis'}
                                                    </h3>
                                                </div>
                                                <div className={
                                                    assignment.instrument_type === 'formative_quiz'
                                                        ? "p-5 rounded-xl bg-slate-50 dark:bg-slate-950/40 bg-slate-50 border border-slate-200 dark:border-slate-800 border-slate-100"
                                                        : "p-5 rounded-xl bg-muted/50 border border-border"
                                                }>
                                                    <p className={`text-xs font-bold leading-relaxed ${
                                                        assignment.instrument_type === 'formative_quiz'
                                                            ? 'text-slate-700 dark:text-slate-300'
                                                            : 'text-slate-600 dark:text-slate-300'
                                                    }`}>
                                                        Anda telah menyelesaikan {assignment.instrument_type === 'formative_quiz' ? 'kuis' : 'tes'} ini. {displayScore !== null ? `Skor Anda adalah ${displayScore} dari ${assignment.max_points} poin.` : 'Menunggu hasil penilaian otomatis/guru.'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        {assignment.instrument_type === 'formative_quiz' && (assignment.instrument_config?.assessment_mode) === 'checklist' && (
                                            <div className="pt-6 border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-4">
                                                <div className="flex items-center gap-2 mb-6">
                                                    <CheckSquare className="h-4 w-4 text-primary" />
                                                    <h3 className="text-xs font-black text-foreground uppercase tracking-widest">Hasil Ceklis Jawaban</h3>
                                                </div>
                                                {(() => {
                                                    try {
                                                        const p = JSON.parse(my_submission.content);
                                                        if (p.type !== 'formative_quiz' || p.assessment_mode !== 'checklist') return null;
                                                        return (
                                                            <div className="space-y-2">
                                                                {(p.indicators || []).map((ind: any, idx: number) => (
                                                                    <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border ${ind.checked ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800' : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'}`}>
                                                                        {ind.checked ? <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" /> : <Square className="h-4 w-4 text-red-400 shrink-0" />}
                                                                        <span className={`text-xs font-medium ${ind.checked ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'}`}>{ind.name}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        );
                                                    } catch { return null; }
                                                })()}
                                            </div>
                                        )}
                                        {assignment.instrument_type === 'performance_observation' && (
                                            <div className="pt-6 border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-4">
                                                <div className="flex items-center gap-2 mb-6">
                                                    <Activity className="h-4 w-4 text-emerald-500" />
                                                    <h3 className="text-xs font-black text-foreground uppercase tracking-widest">Hasil Observasi Kinerja</h3>
                                                </div>
                                                {(() => {
                                                    try {
                                                        const p = JSON.parse(my_submission.content);
                                                        if (p.type === 'performance_observation') {
                                                            return (
                                                                <div className="space-y-6">
                                                                    <div className="grid gap-3">
                                                                        {(assignment.instrument_config?.indicators || []).map((indicator: any, idx: number) => {
                                                                            const indKey = indicator.id || indicator.name || indicator.text || idx.toString();
                                                                            const val = p.observations?.[indKey];
                                                                            const isChecked = val === true || val === 'konsisten' || val === 'mulai';
                                                                            return (
                                                                                <div key={indKey} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900 border border-border shadow-sm">
                                                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{typeof indicator === 'string' ? indicator : (indicator.text || indicator.name || indicator.description || '')}</span>
                                                                                    {isChecked ? (
                                                                                        <span className="px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-1">
                                                                                            <CheckCircle2 className="h-3 w-3" /> Terlihat
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest bg-rose-50 dark:bg-rose-950/20 text-rose-600 border border-rose-100 dark:border-rose-900/30">
                                                                                            Belum Terlihat
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    {p.notes && (
                                                                        <div className="p-5 rounded-xl bg-muted/50 border border-border">
                                                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Umpan Balik Guru:</p>
                                                                            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed italic">"{p.notes}"</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        }
                                                    } catch(e) {}
                                                    return null;
                                                })()}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center py-10 text-center space-y-4">
                                        {['observation_checklist', 'anecdotal_notes', 'performance_observation'].includes(assignment.instrument_type) ? (
                                            <>
                                                <div className={`h-16 w-16 rounded-xl ${assignment.instrument_type === 'anecdotal_notes' ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500' : 'bg-sky-50 dark:bg-sky-950/20 text-primary'} flex items-center justify-center`}>
                                                    {assignment.instrument_type === 'anecdotal_notes' ? <FileText className="h-8 w-8 opacity-50" /> : <Activity className="h-8 w-8 opacity-50" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-foreground uppercase tracking-widest">
                                                        {assignment.instrument_type === 'anecdotal_notes' ? 'Menunggu Catatan Anekdotal' : 'Menunggu Observasi'}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Guru akan mencatat perkembangan Anda di kelas.</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="h-16 w-16 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-500">
                                                    <Clock className="h-8 w-8 opacity-50" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-foreground uppercase tracking-widest">Belum Dikerjakan</p>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Selesaikan sebelum tenggat waktu.</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-white dark:bg-slate-900 p-8 shadow-sm">
                            <CommentSection 
                                assignmentId={assignment.id} 
                                comments={comments} 
                                authId={auth_id} 
                                userRole={user_role} 
                            />
                    </div>
                </div>
            )}
        </div>

            {/* Observation Modal (TEACHER) */}
            {selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto custom-scrollbar rounded-xl bg-card p-4 sm:p-6 shadow-none border border-border animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className={`h-12 w-12 rounded-xl ${
                                    assignment.instrument_type === 'anecdotal_notes' 
                                        ? 'bg-indigo-500 shadow-indigo-200' 
                                        : (assignment.instrument_type === 'oral_test' || assignment.instrument_type === 'oral')
                                            ? 'bg-emerald-500 shadow-emerald-200'
                                            : 'bg-sky-500 shadow-sky-200'
                                } flex items-center justify-center text-white shadow-lg`}>
                                    {assignment.instrument_type === 'anecdotal_notes' 
                                        ? <FileText className="h-6 w-6" /> 
                                        : (assignment.instrument_type === 'oral_test' || assignment.instrument_type === 'oral')
                                            ? <Mic className="h-6 w-6" />
                                            : <Activity className="h-6 w-6" />
                                    }
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-foreground tracking-tight">
                                        {assignment.instrument_type === 'anecdotal_notes' 
                                            ? 'Catatan Anekdotal' 
                                            : (assignment.instrument_type === 'oral_test' || assignment.instrument_type === 'oral')
                                                ? 'Penilaian Tes Lisan' 
                                                : 'Observasi Siswa'
                                        }
                                    </h3>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{selectedStudent.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedStudent(null)} className="h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors">
                                <X className="h-6 w-6 text-muted-foreground" />
                            </button>
                        </div>

                        {assignment.instrument_type === 'anecdotal_notes' ? (
                            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                {(assignment.instrument_config?.stimulus || assignment.description) && (
                                    <div className="p-6 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 shadow-sm space-y-3 mb-4">
                                        <div className="flex items-center gap-2 text-indigo-500">
                                            <Info className="h-4 w-4" />
                                            <h4 className="text-[10px] font-black uppercase tracking-widest">Stimulus / Konteks Observasi</h4>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: assignment.instrument_config?.stimulus || assignment.description || '' }} />
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Tanggal Kejadian</label>
                                        <input 
                                            type="date"
                                            value={anecdotalData.date}
                                            onChange={(e) => setAnecdotalData({ ...anecdotalData, date: e.target.value })}
                                            className="w-full rounded-xl border border-border bg-slate-50/50 dark:bg-slate-800/50 px-5 py-3 text-xs font-bold focus:border-indigo-400 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Waktu & Tempat</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text"
                                                placeholder="Waktu"
                                                value={anecdotalData.time}
                                                onChange={(e) => setAnecdotalData({ ...anecdotalData, time: e.target.value })}
                                                className="w-24 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-800/50 px-4 py-3 text-xs font-bold focus:border-indigo-400 outline-none transition-all"
                                            />
                                            <input 
                                                type="text"
                                                placeholder="Lokasi..."
                                                value={anecdotalData.location}
                                                onChange={(e) => setAnecdotalData({ ...anecdotalData, location: e.target.value })}
                                                className="flex-1 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-800/50 px-4 py-3 text-xs font-bold focus:border-indigo-400 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Konteks Kejadian</label>
                                    <input 
                                        type="text"
                                        placeholder="Misal: Saat mengerjakan proyek kelompok membuat miniatur tata surya"
                                        value={anecdotalData.context}
                                        onChange={(e) => setAnecdotalData({ ...anecdotalData, context: e.target.value })}
                                        className="w-full rounded-xl border border-border bg-slate-50/50 dark:bg-slate-800/50 px-5 py-4 text-xs font-medium focus:border-indigo-400 outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Deskripsi Peristiwa (Objektif & Faktual)</label>
                                    <textarea 
                                        rows={4}
                                        placeholder="Apa yang diucapkan atau dilakukan murid secara objektif..."
                                        value={anecdotalData.event_description}
                                        onChange={(e) => setAnecdotalData({ ...anecdotalData, event_description: e.target.value })}
                                        className="w-full rounded-xl border border-border bg-slate-50/50 dark:bg-slate-800/50 px-6 py-4 text-xs font-medium focus:border-indigo-400 outline-none transition-all resize-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Analisis & Tindak Lanjut</label>
                                    <textarea 
                                        rows={4}
                                        placeholder="Interpretasi guru dan rencana strategi ke depannya..."
                                        value={anecdotalData.analysis_followup}
                                        onChange={(e) => setAnecdotalData({ ...anecdotalData, analysis_followup: e.target.value })}
                                        className="w-full rounded-xl border border-border bg-slate-50/50 dark:bg-slate-800/50 px-6 py-4 text-xs font-medium focus:border-emerald-400 outline-none transition-all resize-none"
                                    />
                                </div>

                                <div className="flex gap-4 pt-6">
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedStudent(null)}
                                        className="flex-1 rounded-md bg-slate-100 dark:bg-slate-800 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest hover:bg-slate-200 transition-all"
                                    >
                                        Batal
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={handleSaveAnecdotal}
                                        className="flex-[2] rounded-md bg-gradient-to-r from-indigo-500 to-purple-600 py-4 text-xs font-black text-white shadow-xl shadow-indigo-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest"
                                    >
                                        <Save className="h-4 w-4 inline mr-2" />
                                        Simpan Catatan
                                    </button>
                                </div>
                            </div>
                        ) : assignment.instrument_type === 'oral_test' ? (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar space-y-8">
                                    {(assignment.instrument_config?.stimulus || assignment.description) && (
                                        <div className="p-6 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 shadow-sm space-y-3">
                                            <div className="flex items-center gap-2 text-indigo-500">
                                                <Info className="h-4 w-4" />
                                                <h4 className="text-[10px] font-black uppercase tracking-widest">Stimulus / Konteks Tes Lisan</h4>
                                            </div>
                                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: assignment.instrument_config?.stimulus || assignment.description || '' }} />
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-4">Skor Akhir (0 - {assignment.max_points})</label>
                                            <div className="relative group">
                                                <input 
                                                    type="number"
                                                    value={oralTestData.score}
                                                    onChange={(e) => {
                                                        const val = Math.min(assignment.max_points, Math.max(0, parseInt(e.target.value) || 0));
                                                        setOralTestData({ ...oralTestData, score: val });
                                                    }}
                                                    className="w-full rounded-xl border border-border bg-slate-50/50 dark:bg-slate-800/50 px-8 py-5 text-3xl font-black text-primary focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 outline-none transition-all text-center"
                                                />
                                                <div className="absolute top-1/2 -translate-y-1/2 right-6 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setOralTestData(prev => ({ ...prev, score: Math.min(assignment.max_points, prev.score + 5) }))} className="p-1 hover:bg-indigo-50 rounded-md text-indigo-500"><ChevronUp className="h-4 w-4" /></button>
                                                    <button onClick={() => setOralTestData(prev => ({ ...prev, score: Math.max(0, prev.score - 5) }))} className="p-1 hover:bg-rose-50 rounded-md text-rose-500"><ChevronDown className="h-4 w-4" /></button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-4">Catatan & Umpan Balik Langsung</label>
                                            <textarea 
                                                rows={3}
                                                value={oralTestData.notes}
                                                onChange={(e) => setOralTestData({ ...oralTestData, notes: e.target.value })}
                                                placeholder="Ketik catatan di sini saat siswa berbicara..."
                                                className="w-full h-full rounded-xl border border-border bg-slate-50/50 dark:bg-slate-800/50 px-6 py-5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                                            />
                                        </div>
                                    </div>



                                    <div className="space-y-6 pt-6 border-t border-border">
                                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                            <Mic className="h-4 w-4" /> Panduan Pertanyaan & Respon Siswa
                                        </h4>
                                        <div className="grid gap-6">
                                            {(assignment.instrument_config?.questions || []).map((q: any, idx: number) => {
                                                const selectedLevel = oralTestData.kktp_details?.[q.id] || '';
                                                const totalQuestions = (assignment.instrument_config?.questions || []).length || 1;
                                                const qPoints = Number(q.points) || (assignment.max_points / totalQuestions) || 10;
                                                const scoresMap = { BB: 25, LY: 50, CK: 75, MH: 100 };
                                                const pct = scoresMap[selectedLevel] || 0;
                                                const qScore = selectedLevel ? Math.round((pct / 100) * qPoints) : 0;
                                                
                                                return (
                                                    <div key={q.id} className="p-6 rounded-xl bg-slate-50/50 dark:bg-slate-800/20 border border-border space-y-4">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="flex-1 space-y-1">
                                                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Pertanyaan 0{idx + 1}</span>
                                                                <p className="text-xs font-black text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">{q.question || q.text}</p>
                                                            </div>
                                                            <div className="px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 max-w-[240px]">
                                                                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Panduan Kunci</span>
                                                                <p className="text-[10px] text-slate-600 dark:text-muted-foreground italic leading-snug">{q.answer_guide || 'Tidak ada panduan khusus.'}</p>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Pemahaman Konsep Rubric Selector */}
                                                        <div className="pt-4 border-t border-border/60 space-y-3">
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="font-black text-muted-foreground uppercase tracking-widest">Pemahaman Konsep</span>
                                                                <span className="font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 px-3 py-1 rounded-lg border border-indigo-100/30">
                                                                    Skor: {qScore} / {qPoints}
                                                                </span>
                                                            </div>
                                                            
                                                            <div className="grid grid-cols-4 gap-2">
                                                                {[
                                                                    { code: 'BB', name: 'Baru Berkembang', desc: 'Belum mampu menjelaskan konsep dasar meskipun sudah dipancing.' },
                                                                    { code: 'LY', name: 'Layak', desc: 'Mampu menjelaskan konsep dasar, namun masih ada kekeliruan kecil.' },
                                                                    { code: 'CK', name: 'Cakap', desc: 'Mampu menjelaskan sebagian besar konsep materi dengan benar.' },
                                                                    { code: 'MH', name: 'Mahir', desc: 'Mampu menjelaskan seluruh konsep secara mendalam dan akurat.' }
                                                                ].map((lvl) => {
                                                                    const isSelected = selectedLevel === lvl.code;
                                                                    return (
                                                                        <button
                                                                            key={lvl.code}
                                                                            type="button"
                                                                            title={lvl.desc}
                                                                            onClick={() => {
                                                                                const newKktp = { ...(oralTestData.kktp_details || {}), [q.id]: lvl.code };
                                                                                
                                                                                let totalScore = 0;
                                                                                const oralQuestions = assignment.instrument_config?.questions || [];
                                                                                oralQuestions.forEach((oq: any) => {
                                                                                    const oqPoints = Number(oq.points) || (assignment.max_points / oralQuestions.length) || 10;
                                                                                    const lvlCode = newKktp[oq.id];
                                                                                    if (lvlCode) {
                                                                                        const pctVal = scoresMap[lvlCode] || 0;
                                                                                        totalScore += (pctVal / 100) * oqPoints;
                                                                                    }
                                                                                });
                                                                                
                                                                                setOralTestData({
                                                                                    ...oralTestData,
                                                                                    kktp_details: newKktp,
                                                                                    score: Math.min(assignment.max_points, Math.round(totalScore))
                                                                                });
                                                                            }}
                                                                            className={`p-2.5 rounded-xl border text-center text-xs font-black transition cursor-pointer leading-tight truncate ${
                                                                                isSelected
                                                                                    ? 'bg-indigo-650 text-white border-indigo-600 shadow-xs'
                                                                                    : 'bg-white dark:bg-slate-900 border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                                                            }`}
                                                                        >
                                                                            {lvl.code}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                            {selectedLevel && (
                                                                <p className="text-[10px] text-muted-foreground leading-normal italic p-2.5 bg-white dark:bg-slate-900 border border-border/40 rounded-lg">
                                                                    {
                                                                        [
                                                                            { code: 'BB', desc: 'Belum mampu menjelaskan konsep dasar meskipun sudah dipancing.' },
                                                                            { code: 'LY', desc: 'Mampu menjelaskan konsep dasar, namun masih ada kekeliruan kecil.' },
                                                                            { code: 'CK', desc: 'Mampu menjelaskan sebagian besar konsep materi dengan benar.' },
                                                                            { code: 'MH', desc: 'Mampu menjelaskan seluruh konsep secara mendalam dan akurat.' }
                                                                        ].find(l => l.code === selectedLevel)?.desc
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-6 border-t border-slate-50 dark:border-slate-800">
                                    <div />
                                    <div className="flex gap-4">
                                        <button 
                                            type="button"
                                            onClick={() => setSelectedStudent(null)}
                                            className="px-8 py-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-black text-muted-foreground uppercase tracking-widest hover:bg-slate-200 transition-all"
                                        >
                                            Selesai
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={handleSaveOralTest}
                                            className="px-10 py-4 rounded-xl bg-indigo-600 text-xs font-black text-white shadow-xl shadow-indigo-100 dark:shadow-none hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
                                        >
                                            Simpan Sekarang
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : assignment.instrument_type === 'performance' ? (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar space-y-10">
                                    {(assignment.instrument_config?.stimulus || assignment.description) && (
                                        <div className="p-6 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 shadow-sm space-y-3">
                                            <div className="flex items-center gap-2 text-indigo-500">
                                                <Info className="h-4 w-4" />
                                                <h4 className="text-[10px] font-black uppercase tracking-widest">Stimulus / Konteks Kinerja</h4>
                                            </div>
                                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: assignment.instrument_config?.stimulus || assignment.description || '' }} />
                                        </div>
                                    )}
                                    {/* Score Header */}
                                    <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/20 p-6 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-none">
                                                <Zap className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-widest leading-none">Skor Akhir Otomatis</h4>
                                                <p className="text-[9px] text-emerald-600 dark:text-emerald-500 font-bold uppercase tracking-widest mt-1">Berdasarkan Bobot Kriteria</p>
                                            </div>
                                        </div>
                                        <div className="text-4xl font-black text-emerald-600 tracking-tighter">
                                            {teacherForm.data.score}
                                        </div>
                                    </div>

                                    {/* Criteria / Indicators Checklist */}
                                    <div className="space-y-6">
                                        {assignment.instrument_config?.indicators && assignment.instrument_config.indicators.length > 0 ? (
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                    <Activity className="h-4 w-4 text-emerald-500" /> Indikator Ketercapaian Unjuk Kerja
                                                </h4>
                                                <div className="grid gap-3">
                                                    {assignment.instrument_config.indicators.map((indicator: any, idx: number) => {
                                                        const indicatorKey = indicator.id || indicator.name || indicator.text || idx.toString();
                                                        const isChecked = !!performanceData.scores[indicatorKey];
                                                        return (
                                                            <label 
                                                                key={indicatorKey} 
                                                                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer select-none transition-all ${
                                                                    isChecked
                                                                        ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                                                                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-300'
                                                                }`}
                                                            >
                                                                <input 
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={(e) => {
                                                                        const newScores = { ...performanceData.scores, [indicatorKey]: e.target.checked };
                                                                        setPerformanceData({ ...performanceData, scores: newScores });
                                                                        const finalScore = calculatePerformanceScore(newScores);
                                                                        teacherForm.setData('score', finalScore);
                                                                    }}
                                                                    className="sr-only"
                                                                />
                                                                <div className={`h-5 w-5 rounded-lg flex items-center justify-center shrink-0 border-2 transition-all ${
                                                                    isChecked
                                                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                                                        : 'border-slate-300 dark:border-slate-600'
                                                                }`}>
                                                                    {isChecked && <CheckCircle2 className="h-3.5 w-3.5" />}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-black text-slate-350 dark:text-slate-650">0{idx + 1}</span>
                                                                        <p className={`text-xs font-bold leading-none ${ isChecked ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200' }`}>
                                                                            {typeof indicator === 'string' ? indicator : (indicator.text || indicator.name || indicator.description || '')}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                {isChecked && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            (assignment.instrument_config?.criteria || []).map((criterion: any) => (
                                                <div key={criterion.id} className="space-y-5">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-muted-foreground">
                                                                {criterion.weight}%
                                                            </div>
                                                            <h4 className="text-xs font-black text-foreground uppercase tracking-widest">{criterion.text}</h4>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                        {(assignment.instrument_config?.levels || []).map((level: any) => (
                                                            <button
                                                                key={level.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    const newScores = { ...performanceData.scores, [criterion.id]: level.id };
                                                                    setPerformanceData({ ...performanceData, scores: newScores });
                                                                    const final = calculatePerformanceScore(newScores);
                                                                    teacherForm.setData('score', final);
                                                                }}
                                                                className={`p-5 rounded-xl border-2 transition-all text-left flex flex-col justify-between h-full group ${performanceData.scores[criterion.id] === level.id ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-slate-50 dark:border-slate-800 bg-slate-50/20 hover:border-emerald-200'}`}
                                                            >
                                                                <div>
                                                                    <div className="flex items-center justify-between mb-3">
                                                                        <span className={`text-[9px] font-black uppercase tracking-tighter ${performanceData.scores[criterion.id] === level.id ? 'text-emerald-600' : 'text-muted-foreground group-hover:text-emerald-500'}`}>{level.name}</span>
                                                                        {performanceData.scores[criterion.id] === level.id && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                                                                    </div>
                                                                    <p className={`text-[10px] leading-relaxed font-medium ${performanceData.scores[criterion.id] === level.id ? 'text-slate-700 dark:text-slate-200' : 'text-muted-foreground dark:text-muted-foreground'}`}>
                                                                        {criterion.descriptions[level.id] || 'Belum ada deskripsi.'}
                                                                    </p>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between mb-4 mt-6">
                                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Status KKTP:</span>
                                        {(() => {
                                            const kktp = assignment.instrument_config?.kktp;
                                            if (!kktp) return <span className="text-[9px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md uppercase tracking-wider">Belum Diatur</span>;
                                            
                                            let total = (assignment.instrument_config?.indicators || []).length;
                                            if (!total && assignment.instrument_config?.criteria) total = assignment.instrument_config.criteria.length;
                                            
                                            const isChecklist = assignment.instrument_config?.indicators && assignment.instrument_config.indicators.length > 0;
                                            let metCount = 0;
                                            if (isChecklist) {
                                                metCount = Object.values(performanceData.scores).filter(v => v === true).length;
                                            } else {
                                                const levels = assignment.instrument_config?.levels || [];
                                                const passingIdx = levels.findIndex((l: any) => l.name === kktp.passing_level);
                                                Object.values(performanceData.scores).forEach((levelId: any) => {
                                                    const lvlIdx = levels.findIndex((l: any) => l.id === levelId);
                                                    if (passingIdx > -1 && lvlIdx >= passingIdx) {
                                                        metCount++;
                                                    } else if (passingIdx === -1 && lvlIdx >= Math.floor(levels.length / 2)) {
                                                        metCount++;
                                                    }
                                                });
                                            }
                                            
                                            let isPassed = false;
                                            if (kktp.approach === 'percentage') {
                                                const threshold = kktp.threshold || 75;
                                                const percentage = total > 0 ? (metCount / total) * 100 : 0;
                                                isPassed = percentage >= threshold;
                                            } else if (kktp.approach === 'criteria_description' || kktp.approach === 'rubric') {
                                                const minCriteria = kktp.min_criteria ?? Math.max(1, Math.round(total / 2));
                                                isPassed = metCount >= minCriteria;
                                            } else {
                                                isPassed = total > 0 ? (metCount / total) >= 0.75 : false;
                                            }
                                            return isPassed ? (
                                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded-md uppercase tracking-wider">Tuntas ({metCount}/{total})</span>
                                            ) : (
                                                <span className="text-[9px] font-black text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-2 py-1 rounded-md uppercase tracking-wider">Belum Tuntas ({metCount}/{total})</span>
                                            );
                                        })()}
                                    </div>

                                    {/* Evidence & Notes */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-border">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-4">Bukti Praktik (Foto/Video)</label>
                                            <div className="relative group/upload h-40 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden hover:border-emerald-400 transition-all">
                                                {performanceData.evidence_preview ? (
                                                    <div className="relative w-full h-full group">
                                                        <img src={performanceData.evidence_preview} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                                            <button 
                                                                type="button"
                                                                onClick={() => setPerformanceData({ ...performanceData, evidence: null, evidence_preview: '' })}
                                                                className="h-10 w-10 rounded-full bg-rose-500 text-white flex items-center justify-center hover:scale-110 transition-transform"
                                                            >
                                                                <Trash2 className="h-5 w-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center space-y-2">
                                                        <div className="h-12 w-12 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mx-auto group-hover/upload:scale-110 group-hover/upload:text-emerald-500 transition-all">
                                                            <Camera className="h-6 w-6" />
                                                        </div>
                                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Klik untuk unggah bukti</p>
                                                        <input 
                                                            type="file" 
                                                            accept="image/*,video/*"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    setPerformanceData({ ...performanceData, evidence: file, evidence_preview: URL.createObjectURL(file) });
                                                                }
                                                            }}
                                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-4">Umpan Balik Perbaikan</label>
                                            <textarea 
                                                rows={6}
                                                value={performanceData.notes}
                                                onChange={(e) => setPerformanceData({ ...performanceData, notes: e.target.value })}
                                                placeholder="Berikan catatan spesifik terkait keterampilan yang perlu ditingkatkan murid..."
                                                className="w-full rounded-xl border border-border bg-slate-50/30 dark:border-slate-800/30 px-6 py-5 text-xs font-medium focus:border-emerald-400 outline-none transition-all resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-6 border-t border-slate-50 dark:border-slate-800">
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedStudent(null)}
                                        className="flex-1 rounded-md bg-slate-100 dark:bg-slate-800 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest hover:bg-slate-200 transition-all"
                                    >
                                        Batal
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={handleSavePerformance}
                                        className="flex-[2] rounded-md bg-gradient-to-r from-emerald-500 to-teal-600 py-4 text-xs font-black text-white shadow-xl shadow-emerald-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest"
                                    >
                                        <Save className="h-4 w-4 inline mr-2" />
                                        Simpan Penilaian Kinerja
                                    </button>
                                </div>
                            </div>
                        ) : assignment.instrument_type === 'project' ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in zoom-in-95 duration-500">
                                {/* Left Side: Submission Preview */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 flex items-center justify-center">
                                            <FolderOpen className="h-4 w-4" />
                                        </div>
                                        <h4 className="text-xs font-black text-foreground uppercase tracking-widest">Hasil Karya Siswa</h4>
                                    </div>
                                    
                                    <div className="rounded-xl bg-muted/40 border border-slate-100 dark:border-slate-700 p-8 min-h-[400px] flex flex-col items-center justify-center text-center">
                                        {submissionMap[selectedStudent.id] ? (
                                            <div className="w-full space-y-6">
                                                {/* File/Link Preview Logic */}
                                                <div className="aspect-video w-full rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-border flex flex-col items-center justify-center p-8">
                                                    <div className="h-16 w-16 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 flex items-center justify-center mb-4">
                                                        {submissionMap[selectedStudent.id].content_type?.includes('image') ? <ImageIcon className="h-8 w-8" /> : <FileText className="h-8 w-8" />}
                                                    </div>
                                                    <p className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest truncate max-w-full px-4">
                                                        {submissionMap[selectedStudent.id].original_filename || 'File Tugas'}
                                                    </p>
                                                    <a 
                                                        href={submissionMap[selectedStudent.id].file_path ?? undefined} 
                                                        target="_blank"
                                                        className="mt-6 px-6 py-3 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
                                                    >
                                                        Buka / Download File
                                                    </a>
                                                </div>
                                                <div className="p-6 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 space-y-4">
                                                    <h5 className="text-[9px] font-black text-primary uppercase tracking-widest mb-2 flex items-center gap-2">
                                                        <MessageSquare className="h-3 w-3" /> Detail Proyek Siswa
                                                    </h5>
                                                    {(() => {
                                                        try {
                                                            const parsed = JSON.parse(submissionMap[selectedStudent.id].content || '{}');
                                                            return (
                                                                <>
                                                                    {parsed.description && (
                                                                        <div>
                                                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Deskripsi Proyek:</p>
                                                                            <p className="text-xs font-medium text-slate-600 dark:text-muted-foreground italic leading-relaxed whitespace-pre-wrap">{parsed.description}</p>
                                                                        </div>
                                                                    )}
                                                                    {parsed.process_notes && (
                                                                        <div>
                                                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Catatan Proses:</p>
                                                                            <p className="text-xs font-medium text-slate-600 dark:text-muted-foreground italic leading-relaxed whitespace-pre-wrap">{parsed.process_notes}</p>
                                                                        </div>
                                                                    )}
                                                                    {!parsed.description && !parsed.process_notes && (
                                                                        <p className="text-xs font-medium text-slate-600 dark:text-muted-foreground italic">"{submissionMap[selectedStudent.id].content || 'Tidak ada detail proyek.'}"</p>
                                                                    )}
                                                                </>
                                                            );
                                                        } catch {
                                                            return <p className="text-xs font-medium text-slate-600 dark:text-muted-foreground italic">"{submissionMap[selectedStudent.id].content || 'Tidak ada detail proyek.'}"</p>;
                                                        }
                                                    })()}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto opacity-50">
                                                    <AlertCircle className="h-10 w-10 text-muted-foreground" />
                                                </div>
                                                <p className="text-sm font-bold text-muted-foreground italic">Siswa belum mengumpulkan tugas.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Side: Rubric Panel */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100 dark:shadow-none">
                                                <Star className="h-4 w-4" />
                                            </div>
                                            <h4 className="text-xs font-black text-foreground uppercase tracking-widest">Panel Penilaian Proyek</h4>
                                        </div>
                                        <div className="px-6 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30">
                                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block leading-none">Skor Akhir</span>
                                            <span className="text-2xl font-black text-emerald-600 tracking-tighter">{teacherForm.data.score}</span>
                                        </div>
                                    </div>

                                    <div className="max-h-[65vh] overflow-y-auto pr-3 custom-scrollbar space-y-8 pb-8">
                                        {(assignment.instrument_config?.criteria || []).map((criterion: any) => (
                                            <div key={criterion.id} className="space-y-4">
                                                <div className="flex items-center gap-2 ml-2">
                                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{criterion.text}</span>
                                                    <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-800" />
                                                    <span className="text-[9px] font-bold text-muted-foreground">{criterion.weight}%</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {(assignment.instrument_config?.levels || []).map((level: any) => (
                                                        <button
                                                            key={level.id}
                                                            type="button"
                                                            onClick={() => {
                                                                const newScores = { ...projectGradingData.scores, [criterion.id]: level.id };
                                                                setProjectGradingData({ ...projectGradingData, scores: newScores });
                                                                const final = calculatePerformanceScore(newScores);
                                                                teacherForm.setData('score', final);
                                                            }}
                                                            className={`p-4 rounded-xl border-2 transition-all text-left group ${projectGradingData.scores[criterion.id] === level.id ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20' : 'border-slate-50 dark:border-slate-800 bg-slate-50/20 hover:border-indigo-200'}`}
                                                        >
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className={`text-[9px] font-black uppercase tracking-tighter ${projectGradingData.scores[criterion.id] === level.id ? 'text-indigo-600' : 'text-muted-foreground'}`}>{level.name}</span>
                                                                {projectGradingData.scores[criterion.id] === level.id && <CheckCircle2 className="h-3 w-3 text-indigo-500" />}
                                                            </div>
                                                            <p className={`text-[9px] leading-snug font-medium line-clamp-3 ${projectGradingData.scores[criterion.id] === level.id ? 'text-slate-700 dark:text-slate-200' : 'text-muted-foreground dark:text-muted-foreground'}`}>
                                                                {criterion.descriptions[level.id] || 'N/A'}
                                                            </p>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}

                                        {/* Checklist Penilaian Proyek */}
                                        {(() => {
                                            const sub = submissionMap[selectedStudent.id];
                                            let parsedContent: any = {};
                                            try { parsedContent = JSON.parse(sub?.content || '{}'); } catch {}
                                            const hasFile = !!sub?.file_path;
                                            const hasDescription = !!parsedContent.description;
                                            const hasProcessNotes = !!parsedContent.process_notes;
                                            const phases = [
                                                { key: 'phase_planning', label: assignment.instrument_config?.phase_planning || 'Sesuai fase Perencanaan', auto: undefined },
                                                { key: 'phase_execution', label: assignment.instrument_config?.phase_execution || 'Sesuai fase Pelaksanaan', auto: undefined },
                                                { key: 'phase_product', label: assignment.instrument_config?.phase_product || 'Sesuai fase Produk/Hasil', auto: undefined },
                                            ];
                                            const autoItems = [
                                                { key: 'file', label: 'File proyek dikumpulkan', auto: hasFile },
                                                { key: 'description', label: 'Deskripsi proyek diisi', auto: hasDescription },
                                                { key: 'process_notes', label: 'Catatan proses diisi', auto: hasProcessNotes },
                                            ];
                                            const allItems = [...autoItems, ...phases];
                                            return (
                                                <div className="space-y-3 pt-6 border-t border-border">
                                                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                        <ClipboardCheck className="h-4 w-4 text-indigo-500" /> Checklist Penilaian
                                                    </h4>
                                                    <div className="grid gap-1.5">
                                                        {allItems.map(item => {
                                                            const isChecked = projectGradingData.checklist[item.key] ?? item.auto;
                                                            return (
                                                                <label key={item.key} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer select-none transition-all ${isChecked ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0b0f19]/30 bg-white/70 backdrop-blur-md hover:border-indigo-300'}`}>
                                                                    <input type="checkbox" checked={isChecked}
                                                                        onChange={(e) => {
                                                                            const newChecklist = { ...projectGradingData.checklist, [item.key]: e.target.checked };
                                                                            setProjectGradingData({ ...projectGradingData, checklist: newChecklist });
                                                                            const score = calculatePerformanceScore(projectGradingData.scores, newChecklist);
                                                                            teacherForm.setData('score', score);
                                                                        }}
                                                                        className="sr-only"
                                                                    />
                                                                    <div className={`h-5 w-5 rounded-lg flex items-center justify-center shrink-0 border-2 transition-all ${isChecked ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                                                                        {isChecked && <CheckCircle2 className="h-3.5 w-3.5" />}
                                                                    </div>
                                                                    <span className={`text-xs font-bold ${isChecked ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                                        {item.label}
                                                                    </span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        <div className="space-y-4 pt-6 border-t border-border">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-4">Umpan Balik Proyek</label>
                                            <textarea 
                                                rows={4}
                                                value={projectGradingData.notes}
                                                onChange={(e) => setProjectGradingData({ ...projectGradingData, notes: e.target.value })}
                                                placeholder="Berikan apresiasi atau arahan perbaikan untuk proyek ini..."
                                                className="w-full rounded-xl border border-border bg-slate-50/30 px-6 py-5 text-xs font-medium focus:border-indigo-400 outline-none transition-all resize-none"
                                            />
                                        </div>

                                        <div className="flex gap-4 pt-4">
                                            <button 
                                                type="button"
                                                onClick={() => setSelectedStudent(null)}
                                                className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest hover:bg-slate-200 transition-all"
                                            >
                                                Batal
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={handleSaveProject}
                                                className="flex-[2] rounded-xl bg-indigo-600 py-4 text-xs font-black text-white shadow-xl shadow-indigo-100 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest"
                                            >
                                                Simpan & Beri Nilai
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : assignment.instrument_type === 'portfolio' ? (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {(assignment.instrument_config?.stimulus || assignment.description) && (
                                    <div className="p-6 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 shadow-sm space-y-3">
                                        <div className="flex items-center gap-2 text-indigo-500">
                                            <Info className="h-4 w-4" />
                                            <h4 className="text-[10px] font-black uppercase tracking-widest">Stimulus / Konteks Portofolio</h4>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: assignment.instrument_config?.stimulus || assignment.description || '' }} />
                                    </div>
                                )}
                                {/* Portfolio Header */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-amber-50 dark:bg-amber-950/20 p-8 rounded-xl border border-amber-100 dark:border-amber-900/30">
                                    <div className="flex items-center gap-4">
                                        <div className="h-14 w-14 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xl shadow-amber-200 dark:shadow-none">
                                            <Briefcase className="h-8 w-8" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-amber-800 dark:text-amber-300 uppercase tracking-tight">Showcase Portofolio</h4>
                                            <p className="text-xs text-amber-600 dark:text-amber-500 font-bold uppercase tracking-widest mt-1">Kumpulan Karya Terbaik & Refleksi</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Skor Akhir</p>
                                            <input 
                                                type="number"
                                                value={teacherForm.data.score}
                                                onChange={(e) => teacherForm.setData('score', Number(e.target.value))}
                                                className="w-24 bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2 text-center text-xl font-black text-amber-600 outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* Left: Artifact Showcase (2 cols) */}
                                    <div className="lg:col-span-2 space-y-6">
                                        <div className="flex items-center gap-2 ml-4">
                                            <Layers className="h-4 w-4 text-amber-500" />
                                            <h5 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Galeri Karya Digital</h5>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {portfolioData.artifacts.length > 0 ? (
                                                portfolioData.artifacts.map((art: any, idx: number) => (
                                                    <div key={idx} className="group relative aspect-square rounded-xl bg-white dark:bg-slate-900 border border-border shadow-sm overflow-hidden hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                                                        {art.type?.includes('image') ? (
                                                            <img src={art.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                        ) : (
                                                            <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-muted/50">
                                                                <FileText className="h-12 w-12 text-amber-500 mb-4" />
                                                                <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest text-center line-clamp-2 px-4">
                                                                    {art.name || 'Dokumen Karya'}
                                                                </p>
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                                                            <a href={art.url} target="_blank" className="w-full py-3 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest text-center hover:bg-amber-500 hover:text-white transition-colors">
                                                                Lihat Detail
                                                            </a>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="col-span-full h-60 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-center p-8 opacity-50">
                                                    <AlertCircle className="h-10 w-10 text-slate-300 mb-2" />
                                                    <p className="text-sm font-bold text-muted-foreground italic">Belum ada karya yang disematkan.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Reflection & Feedback (1 col) */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 ml-4">
                                            <MessageSquare className="h-4 w-4 text-amber-500" />
                                            <h5 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Refleksi & Umpan Balik</h5>
                                        </div>

                                        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar pb-8">
                                            {/* Student Reflections */}
                                            <div className="space-y-4">
                                                {(assignment.instrument_config?.reflection_prompts || []).map((prompt: string, idx: number) => (
                                                    <div key={idx} className="p-6 rounded-xl bg-muted/40 border border-slate-100 dark:border-slate-700 space-y-2">
                                                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest leading-relaxed">{prompt}</p>
                                                        <p className="text-[11px] font-medium text-slate-600 dark:text-muted-foreground italic">
                                                            "{portfolioData.reflections[idx] || 'Siswa tidak menyertakan refleksi untuk pertanyaan ini.'}"
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Teacher Feedback */}
                                            <div className="space-y-4 pt-6 border-t border-border">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-4">Catatan Evaluasi Guru</label>
                                                <textarea 
                                                    rows={6}
                                                    value={portfolioData.notes}
                                                    onChange={(e) => setPortfolioData({ ...portfolioData, notes: e.target.value })}
                                                    placeholder="Berikan apresiasi atas perkembangan murid dan arahan untuk tantangan selanjutnya..."
                                                    className="w-full rounded-xl border border-border bg-white dark:bg-slate-900 px-6 py-5 text-xs font-medium focus:border-amber-500 outline-none transition-all resize-none shadow-sm"
                                                />
                                            </div>

                                            <div className="flex gap-4 pt-4">
                                                <button 
                                                    type="button"
                                                    onClick={() => setSelectedStudent(null)}
                                                    className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest hover:bg-slate-200 transition-all"
                                                >
                                                    Batal
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={handleSavePortfolio}
                                                    className="flex-[2] rounded-xl bg-amber-600 py-4 text-xs font-black text-white shadow-xl shadow-amber-100 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest"
                                                >
                                                    Simpan Evaluasi
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : assignment.instrument_type === 'rubric' ? (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar space-y-10">
                                    {(assignment.instrument_config?.stimulus || assignment.description) && (
                                        <div className="p-6 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 shadow-sm space-y-3">
                                            <div className="flex items-center gap-2 text-indigo-500">
                                                <Info className="h-4 w-4" />
                                                <h4 className="text-[10px] font-black uppercase tracking-widest">Stimulus / Konteks Penilaian Rubrik</h4>
                                            </div>
                                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: assignment.instrument_config?.stimulus || assignment.description || '' }} />
                                        </div>
                                    )}
                                    {(assignment.instrument_config?.criteria || []).map((criterion: any) => (
                                        <div key={criterion.id} className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-6 w-6 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 flex items-center justify-center border border-amber-100 dark:border-amber-900/30">
                                                    <Star className="h-3 w-3" />
                                                </div>
                                                <h4 className="text-[10px] font-black text-foreground uppercase tracking-widest leading-none">{criterion.text}</h4>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                {(assignment.instrument_config?.levels || []).map((level: any) => (
                                                    <button
                                                        key={level.id}
                                                        type="button"
                                                        onClick={() => setRubricData({ ...rubricData, [criterion.id]: level.id })}
                                                        className={`p-5 rounded-xl border-2 transition-all text-left group flex flex-col justify-between h-full ${rubricData[criterion.id] === level.id ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20' : 'border-slate-50 dark:border-slate-800 bg-slate-50/20 hover:border-amber-200'}`}
                                                    >
                                                        <div>
                                                            <div className="flex items-center justify-between mb-3">
                                                                <span className={`text-[9px] font-black uppercase tracking-tighter ${rubricData[criterion.id] === level.id ? 'text-amber-600' : 'text-muted-foreground group-hover:text-amber-500'}`}>{level.name}</span>
                                                                {rubricData[criterion.id] === level.id && <CheckCircle2 className="h-3 w-3 text-amber-500" />}
                                                            </div>
                                                            <p className={`text-[10px] leading-relaxed font-medium ${rubricData[criterion.id] === level.id ? 'text-slate-700 dark:text-slate-200' : 'text-muted-foreground dark:text-muted-foreground'}`}>
                                                                {criterion.descriptions[level.id] || 'Belum ada deskripsi.'}
                                                            </p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    <div className="space-y-3 pt-6 border-t border-slate-50 dark:border-slate-800">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-4">Umpan Balik Tambahan (Opsional)</label>
                                        <textarea 
                                            rows={3}
                                            value={teacherForm.data.feedback}
                                            onChange={(e) => teacherForm.setData('feedback', e.target.value)}
                                            placeholder="Berikan catatan tambahan terkait performa murid secara keseluruhan..."
                                            className="w-full rounded-xl border border-border bg-slate-50/30 dark:bg-slate-800/30 px-6 py-5 text-xs font-medium focus:border-amber-400 outline-none transition-all resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedStudent(null)}
                                        className="flex-1 rounded-md bg-slate-100 dark:bg-slate-800 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest hover:bg-slate-200 transition-all"
                                    >
                                        Batal
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={handleSaveRubric}
                                        className="flex-[2] rounded-md bg-gradient-to-r from-amber-500 to-orange-600 py-4 text-xs font-black text-white shadow-xl shadow-amber-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest"
                                    >
                                        <Save className="h-4 w-4 inline mr-2" />
                                        Simpan Penilaian Rubrik
                                    </button>
                                </div>
                            </div>
                        ) : ['observation_checklist', 'guided_discussion'].includes(assignment.instrument_type) ? (
                            <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                {(assignment.instrument_config?.stimulus || assignment.description) && (
                                    <div className="p-6 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 shadow-sm space-y-3 mb-4">
                                        <div className="flex items-center gap-2 text-indigo-500">
                                            <Info className="h-4 w-4" />
                                            <h4 className="text-[10px] font-black uppercase tracking-widest">Stimulus / Konteks Observasi</h4>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: assignment.instrument_config?.stimulus || assignment.description || '' }} />
                                    </div>
                                )}
                                {/* Checklist Indicators */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <ListChecks className="h-4 w-4" /> Daftar Indikator Perilaku
                                    </h4>
                                    <div className="grid gap-3">
                                        {(assignment.instrument_config?.indicators || []).map((indicator: any, idx: number) => {
                                            const indicatorKey = indicator.id || indicator.name || indicator.text || idx.toString();
                                            return (
                                                <div key={indicatorKey} className="flex items-center justify-between p-4 rounded-xl border border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 hover:bg-white transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-black text-slate-300">0{idx + 1}</span>
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{typeof indicator === 'string' ? indicator : (indicator.text || indicator.name || indicator.description || '')}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            type="button"
                                                            onClick={() => setObsData({ ...obsData, checklist: { ...obsData.checklist, [indicatorKey]: true } })}
                                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${obsData.checklist[indicatorKey] === true ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-100 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-500'}`}
                                                        >
                                                            Muncul
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={() => setObsData({ ...obsData, checklist: { ...obsData.checklist, [indicatorKey]: false } })}
                                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${obsData.checklist[indicatorKey] === false ? 'bg-rose-500 text-white shadow-sm' : 'bg-slate-100 text-muted-foreground hover:bg-rose-50 hover:text-rose-500'}`}
                                                        >
                                                            Belum
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between mb-4">
                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Status KKTP:</span>
                                    {(() => {
                                        const kktp = assignment.instrument_config?.kktp;
                                        if (!kktp) return <span className="text-[9px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md uppercase tracking-wider">Belum Diatur</span>;
                                        const total = (assignment.instrument_config?.indicators || []).length;
                                        const checkedCount = Object.values(obsData.checklist).filter(v => v === true).length;
                                        let isPassed = false;
                                        if (kktp.approach === 'percentage') {
                                            const threshold = kktp.threshold || 75;
                                            const percentage = total > 0 ? (checkedCount / total) * 100 : 0;
                                            isPassed = percentage >= threshold;
                                        } else if (kktp.approach === 'criteria_description') {
                                            const minCriteria = kktp.min_criteria ?? Math.max(1, Math.round(total / 2));
                                            isPassed = checkedCount >= minCriteria;
                                        } else if (kktp.approach === 'rubric') {
                                            const minCriteria = kktp.min_criteria ?? Math.max(1, Math.round(total / 2));
                                            isPassed = checkedCount >= minCriteria;
                                        } else {
                                            isPassed = total > 0 ? (checkedCount / total) >= 0.75 : false;
                                        }
                                        return isPassed ? (
                                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded-md uppercase tracking-wider">Tuntas ({checkedCount}/{total})</span>
                                        ) : (
                                            <span className="text-[9px] font-black text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-2 py-1 rounded-md uppercase tracking-wider">Belum Tuntas ({checkedCount}/{total})</span>
                                        );
                                    })()}
                                </div>

                                {/* Qualitative Notes */}
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Catatan Observasi</label>
                                        <textarea 
                                            rows={4}
                                            value={obsData.note}
                                            onChange={(e) => setObsData({ ...obsData, note: e.target.value })}
                                            placeholder="Deskripsikan perilaku menonjol atau kejadian saat itu..."
                                            className="w-full rounded-xl border border-border bg-slate-50/50 dark:bg-slate-800/50 px-6 py-4 text-xs font-medium focus:border-sky-400 outline-none transition-all resize-none"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Strategi Tindak Lanjut</label>
                                        <textarea 
                                            rows={4}
                                            value={obsData.action_plan}
                                            onChange={(e) => setObsData({ ...obsData, action_plan: e.target.value })}
                                            placeholder="Tuliskan rencana bimbingan atau tantangan selanjutnya..."
                                            className="w-full rounded-xl border border-border bg-slate-50/50 dark:bg-slate-800/50 px-6 py-4 text-xs font-medium focus:border-emerald-400 outline-none transition-all resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedStudent(null)}
                                        className="flex-1 rounded-md bg-slate-100 dark:bg-slate-800 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest hover:bg-slate-200 transition-all"
                                    >
                                        Batal
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={handleSaveObservation}
                                        className="flex-1 rounded-md bg-gradient-to-r from-emerald-500 to-teal-600 py-4 text-xs font-black text-white shadow-xl shadow-emerald-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest"
                                    >
                                        <Save className="h-4 w-4 inline mr-2" />
                                        Simpan Observasi
                                    </button>
                                </div>
                            </div>
                        ) : assignment.instrument_type === 'performance_observation' ? (
                            <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar animate-in fade-in duration-300">
                                {(assignment.instrument_config?.stimulus || assignment.description) && (
                                    <div className="p-6 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 shadow-sm space-y-3 mb-4">
                                        <div className="flex items-center gap-2 text-indigo-500">
                                            <Info className="h-4 w-4" />
                                            <h4 className="text-[10px] font-black uppercase tracking-widest">Stimulus / Konteks Observasi</h4>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: assignment.instrument_config?.stimulus || assignment.description || '' }} />
                                    </div>
                                )}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <Activity className="h-4 w-4 text-emerald-500" /> Indikator Kinerja yang Diamati
                                    </h4>
                                    <div className="grid gap-3">
                                        {(assignment.instrument_config?.indicators || []).map((indicator: any, idx: number) => {
                                            const indicatorKey = indicator.id || indicator.name || indicator.text || idx.toString();
                                            const isChecked = !!performanceObsData.observations[indicatorKey];
                                            return (
                                                <label 
                                                    key={indicatorKey} 
                                                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer select-none transition-all ${
                                                        isChecked
                                                            ? 'border-emerald-450 bg-emerald-50/60 dark:bg-emerald-950/20'
                                                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-300'
                                                    }`}
                                                >
                                                    <input 
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => setPerformanceObsData({ 
                                                            ...performanceObsData, 
                                                            observations: { 
                                                                ...performanceObsData.observations, 
                                                                [indicatorKey]: e.target.checked 
                                                            } 
                                                        })}
                                                        className="sr-only"
                                                    />
                                                    <div className={`h-5 w-5 rounded-lg flex items-center justify-center shrink-0 border-2 transition-all ${
                                                        isChecked
                                                            ? 'bg-emerald-500 border-emerald-500 text-white'
                                                            : 'border-slate-300 dark:border-slate-600'
                                                    }`}>
                                                        {isChecked && <CheckCircle2 className="h-3.5 w-3.5" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black text-slate-350 dark:text-slate-650">0{idx + 1}</span>
                                                            <p className={`text-xs font-bold leading-none ${ isChecked ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200' }`}>
                                                                {typeof indicator === 'string' ? indicator : (indicator.text || indicator.name || indicator.description || '')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {isChecked && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between mb-4 mt-6">
                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Status KKTP:</span>
                                    {(() => {
                                        const kktp = assignment.instrument_config?.kktp;
                                        if (!kktp) return <span className="text-[9px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md uppercase tracking-wider">Belum Diatur</span>;
                                        const total = (assignment.instrument_config?.indicators || []).length;
                                        const checkedCount = Object.values(performanceObsData.observations).filter(v => v === true || v === 'mulai' || v === 'konsisten').length;
                                        let isPassed = false;
                                        if (kktp.approach === 'percentage') {
                                            const threshold = kktp.threshold || 75;
                                            const percentage = total > 0 ? (checkedCount / total) * 100 : 0;
                                            isPassed = percentage >= threshold;
                                        } else if (kktp.approach === 'criteria_description') {
                                            const minCriteria = kktp.min_criteria ?? Math.max(1, Math.round(total / 2));
                                            isPassed = checkedCount >= minCriteria;
                                        } else if (kktp.approach === 'rubric') {
                                            const minCriteria = kktp.min_criteria ?? Math.max(1, Math.round(total / 2));
                                            isPassed = checkedCount >= minCriteria;
                                        } else {
                                            isPassed = total > 0 ? (checkedCount / total) >= 0.75 : false;
                                        }
                                        return isPassed ? (
                                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded-md uppercase tracking-wider">Tuntas ({checkedCount}/{total})</span>
                                        ) : (
                                            <span className="text-[9px] font-black text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-2 py-1 rounded-md uppercase tracking-wider">Belum Tuntas ({checkedCount}/{total})</span>
                                        );
                                    })()}
                                </div>

                                <div className="space-y-3 border-t border-slate-50 dark:border-slate-800 pt-4">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-4">Catatan Pengamatan & Umpan Balik</label>
                                    <textarea 
                                        rows={4}
                                        value={performanceObsData.notes}
                                        onChange={(e) => setPerformanceObsData({ ...performanceObsData, notes: e.target.value })}
                                        placeholder="Tuliskan detail observasi atau masukan perbaikan untuk siswa..."
                                        className="w-full rounded-xl border border-border bg-slate-50/50 dark:bg-slate-800/50 px-6 py-5 text-xs font-medium focus:border-emerald-400 outline-none transition-all resize-none shadow-sm"
                                    />
                                </div>

                                <div className="flex gap-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedStudent(null)}
                                        className="flex-1 rounded-md bg-slate-100 dark:bg-slate-800 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest hover:bg-slate-200 transition-all"
                                    >
                                        Batal
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={handleSavePerformanceObservation}
                                        className="flex-1 rounded-md bg-gradient-to-r from-emerald-500 to-teal-600 py-4 text-xs font-black text-white shadow-xl shadow-emerald-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest"
                                    >
                                        <Save className="h-4 w-4 inline mr-2" />
                                        Simpan Observasi Kinerja
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center py-10 text-center space-y-4">
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Memuat Instrumen...</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Grading Modal (Standard Quiz/Essay) */}
            {selectedSubmission && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-300">
                    <div className={`w-full max-h-[95vh] overflow-y-auto md:overflow-hidden rounded-xl bg-card shadow-none border border-border animate-in zoom-in-95 duration-300 flex gap-0 custom-scrollbar ${
                        (() => {
                            try {
                                const p = JSON.parse(selectedSubmission.content || '');
                                return p.type === 'concept_map' 
                                    ? 'max-w-[95vw] w-full flex-col lg:flex-row h-[90vh]' 
                                    : 'max-w-4xl flex-col md:flex-row p-4 sm:p-6 md:p-10';
                            } catch { return 'max-w-4xl flex-col md:flex-row p-4 sm:p-6 md:p-10'; }
                        })()
                    }`}>
                        {/* Side: Student Response Preview */}
                        <div className={`overflow-y-auto custom-scrollbar ${
                            (() => {
                                try {
                                    const p = JSON.parse(selectedSubmission.content || '');
                                    return p.type === 'concept_map'
                                        ? 'flex-1 p-4 sm:p-8 h-full flex flex-col min-h-0 overflow-hidden'
                                        : 'flex-1 md:pr-4 max-h-[50vh] md:max-h-[70vh] space-y-6';
                                } catch { return 'flex-1 md:pr-4 max-h-[50vh] md:max-h-[70vh] space-y-6'; }
                            })()
                        }`}>
                            <div className="flex items-center justify-between mb-4 shrink-0">
                                <h3 className="text-lg font-black text-foreground tracking-tight">Evaluasi Jawaban: {selectedSubmission.student_name}</h3>
                                <button
                                    type="button"
                                    onClick={() => setSelectedSubmission(null)}
                                    className="h-8 w-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            {(assignment.instrument_config?.stimulus || assignment.description) && (
                                <div className="p-6 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 shadow-sm space-y-3">
                                    <div className="flex items-center gap-2 text-indigo-500">
                                        <Info className="h-4 w-4" />
                                        <h4 className="text-[10px] font-black uppercase tracking-widest">Stimulus / Konteks Asesmen</h4>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: assignment.instrument_config?.stimulus || assignment.description || '' }} />
                                </div>
                            )}
                            
                            {(() => {
                                try {
                                    const parsed = JSON.parse(selectedSubmission.content || '');
                                    if (parsed.type === 'quiz_response' && assignment.instrument_config?.questions) {
                                        const questions = assignment.instrument_config.questions;
                                        const answers = parsed.answers || {};
                                        let recalculatedScore = 0;
                                        questions.forEach((q: any) => {
                                            const studentAns = answers[q.id];
                                            const points = Number(q.points || 0);
                                            if (q.type === 'multiple_choice') {
                                                const correctOptId = q.answer || q.options?.find((o: any) => o.is_correct)?.id;
                                                if (correctOptId && studentAns == correctOptId) recalculatedScore += points;
                                            } else if (q.type === 'short_answer') {
                                                const correctAns = q.correct_answer || q.answer;
                                                if (correctAns && studentAns?.trim().toLowerCase() == correctAns?.trim().toLowerCase()) {
                                                    recalculatedScore += points;
                                                }
                                            }
                                        });

                                        return (
                                            <div className="space-y-8">
                                                <div className="flex items-center justify-between p-6 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                                                    <div>
                                                        <h4 className="text-xs font-black text-blue-800 dark:text-blue-400 uppercase tracking-widest leading-none mb-1">Skor Sistem</h4>
                                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Kuis Objektif</p>
                                                    </div>
                                                    <span className="text-3xl font-black text-blue-600 tracking-tighter">{recalculatedScore}</span>
                                                </div>
                                                {assignment.instrument_config.questions.map((q: any, idx: number) => {
                                                    const studentAnswer = parsed.answers[q.id];
                                                    const isMcq = q.type === 'multiple_choice';
                                                    const correctOpt = isMcq ? (q.options?.find((o: any) => o.is_correct) || q.options?.find((o: any) => o.id === q.answer)) : null;
                                                    
                                                    return (
                                                        <div key={q.id} className="space-y-4 p-6 rounded-xl bg-muted/50 border border-border">
                                                            <div className="flex items-start gap-3">
                                                                <span className="h-6 w-6 rounded-lg bg-white dark:bg-slate-900 text-[10px] font-black text-muted-foreground flex items-center justify-center shadow-sm">{idx + 1}</span>
                                                                <p className="text-sm font-black text-slate-700 dark:text-slate-200">{q.text}</p>
                                                            </div>
                                                            
                                                            <div className="grid sm:grid-cols-2 gap-4 ml-9">
                                                                <div className="space-y-2">
                                                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Jawaban Siswa:</p>
                                                                    <div className={`p-4 rounded-xl text-xs font-bold ${isMcq ? (studentAnswer === correctOpt?.id?.toString() ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100') : 'bg-white dark:bg-slate-900 text-slate-600 border border-slate-200 dark:border-slate-800 shadow-sm'}`}>
                                                                        {isMcq ? (q.options?.find((o: any) => o.id.toString() === studentAnswer)?.text || 'Tidak dijawab') : (studentAnswer || 'Kosong')}
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Kunci / Referensi:</p>
                                                                    <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 text-xs font-bold italic">
                                                                        {isMcq ? (correctOpt?.text || 'Belum diatur') : (q.correct_answer || q.answer || 'Belum diatur')}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {parsed.note && (
                                                    <div className="p-5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30">
                                                        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2">Catatan Siswa:</p>
                                                        <p className="text-xs text-slate-600 dark:text-muted-foreground italic font-medium">"{parsed.note}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }
                                    if (parsed.type === 'self_assessment') {
                                        if (parsed.assessment_mode === 'checklist') {
                                            return (
                                                <div className="space-y-4">
                                                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Penilaian Diri - Ceklis</p>
                                                    {(parsed.indicators || []).map((ind: any, idx: number) => (
                                                        <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                                                            {ind.checked ? <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" /> : <Square className="h-4 w-4 text-muted-foreground/30 shrink-0" />}
                                                            <span className={`text-xs font-medium ${ind.checked ? 'text-foreground' : 'text-muted-foreground'}`}>{ind.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        }
                                        if (parsed.assessment_mode === 'simple_rubric') {
                                            const levelColors: Record<string, string> = { 'Perlu Bimbingan': 'text-red-600 bg-red-50', 'Cukup': 'text-amber-600 bg-amber-50', 'Baik': 'text-blue-600 bg-blue-50', 'Sangat Baik': 'text-emerald-600 bg-emerald-50' };
                                            return (
                                                <div className="space-y-4">
                                                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Penilaian Diri - Rubrik Sederhana</p>
                                                    {(parsed.indicators || []).map((ind: any, idx: number) => (
                                                        <div key={idx} className="p-3 rounded-xl bg-muted/30 border border-border space-y-2">
                                                            <p className="text-xs font-bold text-foreground">{ind.name}</p>
                                                            <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase ${levelColors[ind.selected_level] || 'bg-muted text-muted-foreground'}`}>{ind.selected_level || '-'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        }
                                        const feelingMap: any = {
                                            very_happy: { label: 'Sangat Senang', icon: '🤩' },
                                            happy: { label: 'Senang', icon: '😊' },
                                            neutral: { label: 'Kurang Senang', icon: '😐' },
                                        };
                                        return (
                                            <div className="space-y-6">
                                                <div className="flex flex-wrap gap-3">
                                                    <div className="px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 flex items-center gap-2">
                                                        <span className="text-xl">{feelingMap[parsed.feeling]?.icon}</span>
                                                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400">{feelingMap[parsed.feeling]?.label || 'Biasa Saja'}</p>
                                                    </div>
                                                    <div className="px-4 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30">
                                                        <p className="text-[8px] font-black text-sky-400 uppercase tracking-widest">Skala Usaha Siswa</p>
                                                        <p className="text-xs font-bold text-sky-700 dark:text-sky-400">{parsed.effort_scale} / 4</p>
                                                    </div>
                                                </div>

                                                {parsed.feeling_reason && (
                                                    <div className="p-5 rounded-xl bg-muted/50 border border-border">
                                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Alasan Perasaan:</p>
                                                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed italic">"{parsed.feeling_reason}"</p>
                                                    </div>
                                                )}

                                                <div className="p-6 rounded-xl bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30">
                                                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3">Catatan Refleksi Siswa:</p>
                                                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-bold italic">"{parsed.reflection_notes}"</p>
                                                </div>
                                            </div>
                                        );
                                    }
                                    if (parsed.type === 'peer_assessment') {
                                        if (parsed.assessment_mode === 'checklist') {
                                            return (
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Penilaian Antarteman - Ceklis</p>
                                                        {parsed.peer_name && <span className="text-xs font-bold text-foreground">→ {parsed.peer_name}</span>}
                                                    </div>
                                                    {(parsed.indicators || []).map((ind: any, idx: number) => (
                                                        <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                                                            {ind.checked ? <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" /> : <Square className="h-4 w-4 text-muted-foreground/30 shrink-0" />}
                                                            <span className={`text-xs font-medium ${ind.checked ? 'text-foreground' : 'text-muted-foreground'}`}>{ind.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        }
                                        if (parsed.assessment_mode === 'simple_rubric') {
                                            const levelColors: Record<string, string> = { 'Perlu Bimbingan': 'text-red-600 bg-red-50', 'Cukup': 'text-amber-600 bg-amber-50', 'Baik': 'text-blue-600 bg-blue-50', 'Sangat Baik': 'text-emerald-600 bg-emerald-50' };
                                            return (
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Penilaian Antarteman - Rubrik Sederhana</p>
                                                        {parsed.peer_name && <span className="text-xs font-bold text-foreground">→ {parsed.peer_name}</span>}
                                                    </div>
                                                    {(parsed.indicators || []).map((ind: any, idx: number) => (
                                                        <div key={idx} className="p-3 rounded-xl bg-muted/30 border border-border space-y-2">
                                                            <p className="text-xs font-bold text-foreground">{ind.name}</p>
                                                            <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase ${levelColors[ind.selected_level] || 'bg-muted text-muted-foreground'}`}>{ind.selected_level || '-'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        }
                                        return (
                                            <div className="space-y-6">
                                                <div className="flex flex-wrap gap-3">
                                                    <div className="px-5 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
                                                        <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-1">Menilai Teman:</p>
                                                        <p className="text-sm font-black text-foreground">{parsed.peer_name}</p>
                                                    </div>
                                                    <div className="px-5 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 flex items-center gap-3">
                                                        <div className="flex items-center gap-1">
                                                            {[1, 2, 3, 4, 5].map((s) => (
                                                                <Star key={s} className={`h-3 w-3 ${parsed.rating >= s ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                                                            ))}
                                                        </div>
                                                        <p className="text-xs font-black text-amber-700 dark:text-amber-400">{parsed.rating} / 5</p>
                                                    </div>
                                                </div>

                                                <div className="grid sm:grid-cols-2 gap-4">
                                                    <div className="p-5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                                                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2">Terbaik di Kelompok:</p>
                                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">"{parsed.best_performer}"</p>
                                                    </div>
                                                    <div className="p-5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
                                                        <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-2">Perlu Peningkatan:</p>
                                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">"{parsed.worst_performer}"</p>
                                                    </div>
                                                </div>

                                                <div className="p-5 rounded-xl bg-muted border border-border shadow-sm">
                                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Kendala Kelompok:</p>
                                                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed italic">"{parsed.obstacles}"</p>
                                                </div>

                                                <div className="p-5 rounded-xl bg-sky-50/30 dark:bg-sky-950/10 border border-sky-100 dark:border-sky-900/30">
                                                    <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-2">Harapan ke Depan:</p>
                                                    <p className="text-xs text-sky-800 dark:text-sky-300 font-bold italic">"{parsed.future_expectations}"</p>
                                                </div>
                                            </div>
                                        );
                                    }
                                    if (parsed.type === 'concept_map') {
                                        return (
                                            <div className="flex-1 flex flex-col min-h-0 space-y-4">
                                                <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
                                                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
                                                        <GitBranch className="h-4 w-4 text-indigo-500" />
                                                        <div>
                                                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-none">Topik Utama</p>
                                                            <p className="text-sm font-black text-foreground leading-tight mt-0.5">{assignment.instrument_config?.central_topic}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                                                        <span>🖱️ Geser = navigasi</span>
                                                        <span>·</span>
                                                        <span>⚲ Scroll = zoom</span>
                                                        <span>·</span>
                                                        <span>⛶ Expand = layar penuh</span>
                                                    </div>
                                                </div>
                                                {parsed.submission_type === 'upload' ? (
                                                    <div className="flex-1 min-h-0 relative overflow-hidden rounded-xl border border-border bg-slate-50 dark:bg-slate-900 p-6 flex flex-col justify-center items-center">
                                                        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-3 self-start">Foto Peta Konsep Murid:</p>
                                                        {selectedSubmission.file_path ? (
                                                            <div className="relative group/img flex-1 flex items-center justify-center min-h-0 overflow-hidden">
                                                                <img 
                                                                    src={`/storage/${selectedSubmission.file_path}`} 
                                                                    alt="Peta Konsep Murid" 
                                                                    className="max-h-full max-w-full object-contain rounded-xl border border-border shadow-lg cursor-zoom-in transition-transform hover:scale-[1.005]"
                                                                    onClick={() => window.open(`/storage/${selectedSubmission.file_path}`, '_blank')}
                                                                />
                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none">
                                                                    <div className="bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-4 py-2 rounded-full flex items-center gap-2">
                                                                        <ExternalLink className="h-3.5 w-3.5" /> Klik untuk buka di tab baru
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-muted-foreground italic">Foto tidak ditemukan.</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-border relative">
                                                        <ConceptMapCanvas 
                                                            data={{ nodes: parsed.nodes || [], edges: parsed.edges || [] }} 
                                                            readOnly={true}
                                                            canvasHeight="h-full"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }
                                    if (parsed.type === 'structured_assignment') {
                                        return (
                                            <div className="space-y-6 animate-in fade-in duration-300">
                                                <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-border shadow-sm space-y-4">
                                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Jawaban LKPD Murid</p>
                                                    <p className="text-sm font-semibold text-foreground whitespace-pre-wrap leading-relaxed">
                                                        {parsed.answer_text || '(Tidak ada jawaban teks)'}
                                                    </p>
                                                </div>
                                                {selectedSubmission.file_path && (
                                                    <a 
                                                        href={`/storage/${selectedSubmission.file_path}`} 
                                                        target="_blank" 
                                                        className="flex items-center gap-3 p-4 rounded-xl bg-sky-50 dark:bg-sky-950/30 text-primary border border-sky-100 dark:border-sky-900/30 hover:bg-sky-100 dark:hover:bg-sky-950/40 transition-all shadow-sm"
                                                    >
                                                        <Download className="h-5 w-5" />
                                                        <div className="text-left">
                                                            <p className="text-xs font-black uppercase tracking-widest">Lihat File Lampiran LKPD</p>
                                                            <p className="text-[10px] font-bold opacity-70">Klik untuk mengunduh/melihat file yang diunggah murid</p>
                                                        </div>
                                                    </a>
                                                )}
                                            </div>
                                        );
                                    }
                                    if (parsed.type === 'project') {
                                        return (
                                            <div className="space-y-6 animate-in fade-in duration-300">
                                                <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-border shadow-sm space-y-4">
                                                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none">Deskripsi Proyek</p>
                                                    <p className="text-sm font-semibold text-foreground whitespace-pre-wrap leading-relaxed mb-4">
                                                        {parsed.description || '(Tidak ada deskripsi)'}
                                                    </p>
                                                    
                                                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none">Catatan Proses</p>
                                                    <p className="text-sm font-semibold text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                                        {parsed.process_notes || '(Tidak ada catatan proses)'}
                                                    </p>
                                                </div>
                                                {selectedSubmission.file_path && (
                                                    <a 
                                                        href={`/storage/${selectedSubmission.file_path}`} 
                                                        target="_blank" 
                                                        className="flex items-center gap-3 p-4 rounded-xl bg-sky-50 dark:bg-sky-950/30 text-primary border border-sky-100 dark:border-sky-900/30 hover:bg-sky-100 dark:hover:bg-sky-950/40 transition-all shadow-sm"
                                                    >
                                                        <Download className="h-5 w-5" />
                                                        <div className="text-left">
                                                            <p className="text-xs font-black uppercase tracking-widest">Lihat Bukti Proyek</p>
                                                            <p className="text-[10px] font-bold opacity-70">Klik untuk mengunduh/melihat bukti proyek</p>
                                                        </div>
                                                    </a>
                                                )}
                                            </div>
                                        );
                                    }
                                    if (parsed.type === 'assignment') {
                                        return (
                                            <div className="space-y-6 animate-in fade-in duration-300">
                                                <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-border shadow-sm space-y-4">
                                                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none">Laporan / Teks Jawaban</p>
                                                    <p className="text-sm font-semibold text-foreground whitespace-pre-wrap leading-relaxed mb-4">
                                                        {parsed.report_text || '(Tidak ada laporan)'}
                                                    </p>
                                                    
                                                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none">Catatan Proses Analisis</p>
                                                    <p className="text-sm font-semibold text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                                        {parsed.analysis_notes || '(Tidak ada catatan analisis)'}
                                                    </p>
                                                </div>
                                                {selectedSubmission.file_path && (
                                                    <a 
                                                        href={`/storage/${selectedSubmission.file_path}`} 
                                                        target="_blank" 
                                                        className="flex items-center gap-3 p-4 rounded-xl bg-sky-50 dark:bg-sky-950/30 text-primary border border-sky-100 dark:border-sky-900/30 hover:bg-sky-100 dark:hover:bg-sky-950/40 transition-all shadow-sm"
                                                    >
                                                        <Download className="h-5 w-5" />
                                                        <div className="text-left">
                                                            <p className="text-xs font-black uppercase tracking-widest">Lihat File Jawaban</p>
                                                            <p className="text-[10px] font-bold opacity-70">Klik untuk mengunduh/melihat file jawaban</p>
                                                        </div>
                                                    </a>
                                                )}
                                            </div>
                                        );
                                    }
                                    if (parsed.type === 'portfolio') {
                                        return (
                                            <div className="space-y-6 animate-in fade-in duration-300">
                                                <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-border shadow-sm space-y-4">
                                                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-3">Refleksi Portofolio</p>
                                                    {(parsed.reflections || []).map((ref: any, idx: number) => (
                                                        <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 bg-slate-50 border border-slate-200 dark:border-slate-800 border-slate-100 space-y-1">
                                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Refleksi {idx + 1}</p>
                                                            <p className="text-sm font-semibold text-foreground whitespace-pre-wrap">{ref.answer || '-'}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                                {selectedSubmission.file_path && (
                                                    <a 
                                                        href={`/storage/${selectedSubmission.file_path}`} 
                                                        target="_blank" 
                                                        className="flex items-center gap-3 p-4 rounded-xl bg-sky-50 dark:bg-sky-950/30 text-primary border border-sky-100 dark:border-sky-900/30 hover:bg-sky-100 dark:hover:bg-sky-950/40 transition-all shadow-sm"
                                                    >
                                                        <Download className="h-5 w-5" />
                                                        <div className="text-left">
                                                            <p className="text-xs font-black uppercase tracking-widest">Lihat Karya Portofolio</p>
                                                            <p className="text-[10px] font-bold opacity-70">Klik untuk mengunduh/melihat karya portofolio</p>
                                                        </div>
                                                    </a>
                                                )}
                                            </div>
                                        );
                                    }
                                    if (parsed.type === 'reflective_journal') {
                                        return (
                                            <div className="space-y-6 animate-in fade-in duration-300">
                                                <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-border shadow-sm space-y-4">
                                                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-3">Refleksi Jurnal Murid</p>
                                                    {(parsed.answers || []).map((ans: any, idx: number) => (
                                                        <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 bg-slate-50 border border-slate-200 dark:border-slate-800 border-slate-100 space-y-1">
                                                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{ans.question || `Pertanyaan ${idx + 1}`}</p>
                                                            <p className="text-sm font-semibold text-foreground whitespace-pre-wrap">{ans.answer || '-'}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    }
                                    if (parsed.type === 'written_test' || parsed.type === 'formative_quiz') {
                                        const systemScore = calculateSystemScore(selectedSubmission.content || '');

                                        return (
                                            <div className="space-y-8">
                                                <div className={`flex items-center justify-between p-6 ${
                                                    parsed.type === 'formative_quiz'
                                                        ? 'rounded-xl bg-primary/10 border border-primary/20 text-primary'
                                                        : 'rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-500'
                                                }`}>
                                                    <div>
                                                        <h4 className={`text-xs font-black uppercase tracking-widest leading-none mb-1 ${
                                                            parsed.type === 'formative_quiz'
                                                                ? 'text-primary dark:text-[#6E79D6]'
                                                                : 'text-rose-700 dark:text-rose-450'
                                                        }`}>Skor Sistem</h4>
                                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Objektif (Pilihan Ganda & Isian)</p>
                                                    </div>
                                                    <span className={`text-3xl font-black tracking-tighter ${
                                                        parsed.type === 'formative_quiz' ? 'text-primary' : 'text-rose-500'
                                                    }`}>{systemScore}</span>
                                                </div>

                                                <div className="space-y-10">
                                                    {(assignment.instrument_config?.questions || []).map((q: any, idx: number) => {
                                                        const studentAns = parsed.answers?.[q.id];
                                                        const isMcq = q.type === 'multiple_choice';
                                                        const correctOpt = isMcq ? (q.options?.find((o: any) => o.is_correct) || q.options?.find((o: any) => o.id === q.answer)) : null;
                                                        const isCorrect = isMcq ? (correctOpt?.id == studentAns) : (studentAns?.trim().toLowerCase() == (q.correct_answer || q.answer)?.trim().toLowerCase());
                                                        
                                                        return (
                                                            <div key={q.id} className="space-y-4">
                                                                <div className="flex items-start gap-4">
                                                                    <span className="text-sm font-black text-slate-300 dark:text-slate-700 mt-0.5">0{idx + 1}</span>
                                                                    <div className="flex-1">
                                                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-relaxed">{q.text}</p>
                                                                        {q.image_url && (
                                                                            <div className="mt-4 max-w-xs">
                                                                                <img 
                                                                                    src={q.image_url} 
                                                                                    alt="Question Image" 
                                                                                    className="w-full rounded-xl border border-border"
                                                                                />
                                                                            </div>
                                                                        )}
                                                                        <div className="flex items-center gap-2 mt-2">
                                                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${q.type === 'essay' ? 'bg-indigo-50 text-indigo-500' : isCorrect ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                                                                                {q.type === 'essay' ? 'Review Manual' : isCorrect ? 'Benar' : 'Salah'}
                                                                            </span>
                                                                            <span className="text-[8px] font-bold text-muted-foreground uppercase">Max: {q.points} pts</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className={`ml-8 p-5 border space-y-3 ${
                                                                    parsed.type === 'formative_quiz'
                                                                        ? 'rounded-xl bg-slate-50 dark:bg-slate-950/40 bg-slate-50 border-slate-200 dark:border-slate-800 border-slate-100'
                                                                        : 'rounded-xl bg-muted/50 border border-border'
                                                                }`}>
                                                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Jawaban Murid:</p>
                                                                    {q.type === 'multiple_choice' ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <div className={`h-4 w-4 rounded-full flex items-center justify-center ${isCorrect ? 'bg-emerald-500' : 'bg-rose-500'} text-white`}>
                                                                                {isCorrect ? <CheckCircle2 className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                                                                            </div>
                                                                            <span className="text-xs font-black text-foreground">
                                                                                {q.options?.find((o: any) => o.id === studentAns)?.text || '(Tidak menjawab)'}
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-xs font-bold text-foreground leading-relaxed">
                                                                            {studentAns || '(Tidak menjawab)'}
                                                                        </p>
                                                                    )}
                                                                    
                                                                    {q.type !== 'essay' && (
                                                                        <div className="pt-3 mt-3 border-t border-border">
                                                                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Kunci Jawaban:</p>
                                                                            <p className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                                                                                {isMcq ? correctOpt?.text : (q.correct_answer || q.answer)}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    }
                                    if (parsed.type === 'exit_ticket') {
                                        const assessmentMode = parsed.assessment_mode || 'default';
                                        if (assessmentMode === 'checklist') {
                                            return (
                                                <div className="space-y-4">
                                                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Exit Ticket - Ceklis Pemahaman</p>
                                                    {(parsed.indicators || []).map((ind: any, idx: number) => (
                                                        <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border animate-in fade-in duration-300">
                                                            {ind.checked ? <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" /> : <Square className="h-4 w-4 text-muted-foreground/30 shrink-0" />}
                                                            <span className={`text-xs font-medium ${ind.checked ? 'text-foreground' : 'text-muted-foreground'}`}>{ind.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        }
                                        if (assessmentMode === 'short_note') {
                                            return (
                                                <div className="space-y-4">
                                                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Exit Ticket - Catatan Singkat</p>
                                                    {(parsed.answers || []).map((ans: any, idx: number) => (
                                                        <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 bg-slate-50 border border-slate-200 dark:border-slate-800 border-slate-100 space-y-1 animate-in fade-in duration-300">
                                                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">{ans.text || `Pertanyaan ${idx + 1}`}</p>
                                                            <p className="text-sm font-semibold text-foreground whitespace-pre-wrap">{ans.answer || '-'}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        }
                                        // Form Standar / Default
                                        const feelingMap: any = {
                                            paham: { label: 'Paham', icon: '😊', color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30' },
                                            ragu: { label: 'Ragu-Ragu', icon: '😐', color: 'text-amber-700 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30' },
                                            bingung: { label: 'Bingung', icon: '🙁', color: 'text-rose-700 bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30' },
                                        };
                                        const emoji = parsed.answers?.emoji;
                                        const feeling = feelingMap[emoji];
                                        return (
                                            <div className="space-y-6 animate-in fade-in duration-300">
                                                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Exit Ticket - Form Standar</p>
                                                {feeling && (
                                                    <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 w-fit ${feeling.color}`}>
                                                        <span className="text-xl">{feeling.icon}</span>
                                                        <p className="text-xs font-bold">{feeling.label}</p>
                                                    </div>
                                                )}
                                                {Array.isArray(parsed.answers?.reflection_answers) && parsed.answers.reflection_answers.length > 0 ? (
                                                    <div className="space-y-4">
                                                        {parsed.answers.reflection_answers.map((ans: any, idx: number) => (
                                                            <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 bg-slate-50 border border-slate-200 dark:border-slate-800 border-slate-100 space-y-1">
                                                                <p className="text-[10px] font-black text-primary uppercase tracking-widest">{ans.question || `Pertanyaan ${idx + 1}`}</p>
                                                                <p className="text-sm font-semibold text-foreground whitespace-pre-wrap">{ans.answer || '-'}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="p-5 rounded-xl bg-muted/50 border border-border">
                                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Catatan Refleksi:</p>
                                                        <p className="text-xs text-slate-600 dark:text-slate-350 font-medium leading-relaxed italic">"{parsed.answers?.reflection || 'Tidak menuliskan umpan balik teks'}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }
                                } catch (e) {}
                                
                                return (
                                    <div className="space-y-6">
                                        <div className="p-8 rounded-xl bg-muted/50 border border-border">
                                            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">Isi Jawaban:</p>
                                            {(() => {
                                                try {
                                                    const parsed = JSON.parse(selectedSubmission.content || '');
                                                    if (parsed && typeof parsed === 'object') {
                                                        const answers = parsed.answers || parsed;
                                                        const note = parsed.note || '';
                                                        
                                                        return (
                                                            <div className="space-y-4">
                                                                {Object.entries(answers).map(([key, val]: [string, any], idx) => {
                                                                    const isObjWithQAndA = val && typeof val === 'object' && ('question' in val || 'answer' in val);
                                                                    const qText = isObjWithQAndA ? (val.question || `Pertanyaan ${idx + 1}`) : `Pertanyaan ${idx + 1}`;
                                                                    const aText = isObjWithQAndA ? (val.answer || '-') : String(val);
                                                                    
                                                                    return (
                                                                        <div key={key} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-border shadow-sm space-y-1">
                                                                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{qText}</p>
                                                                            <p className="text-sm font-bold text-foreground whitespace-pre-wrap">{aText}</p>
                                                                        </div>
                                                                    );
                                                                })}
                                                                {note && (
                                                                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                                                                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Catatan Tambahan:</p>
                                                                        <p className="text-sm font-bold text-muted-foreground italic">"{note}"</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    }
                                                } catch (e) {}

                                                return (
                                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap font-medium leading-relaxed italic">
                                                        {selectedSubmission.content ? `"${selectedSubmission.content}"` : "Siswa tidak mengirimkan jawaban teks atau file lampiran."}
                                                    </p>
                                                );
                                            })()}
                                        </div>
                                        {selectedSubmission.file_path && (
                                            <a 
                                                href={`/storage/${selectedSubmission.file_path}`} 
                                                target="_blank" 
                                                className="flex items-center gap-3 p-4 rounded-xl bg-sky-50 dark:bg-sky-950/30 text-primary border border-sky-100 dark:border-sky-900/30 hover:bg-sky-100 transition-all shadow-sm"
                                            >
                                                <Download className="h-5 w-5" />
                                                <div className="text-left">
                                                    <p className="text-xs font-black uppercase tracking-widest">Lihat Lampiran</p>
                                                    <p className="text-[10px] font-bold opacity-70">Klik untuk mengunduh/melihat file</p>
                                                </div>
                                            </a>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Side: Grading Form */}
                        <div className={`bg-muted/50 border-border overflow-y-auto custom-scrollbar ${
                            (() => {
                                try {
                                    const p = JSON.parse(selectedSubmission.content || '');
                                    return p.type === 'concept_map'
                                        ? 'w-full lg:w-[400px] p-4 sm:p-8 border-t lg:border-t-0 lg:border-l border-slate-150 dark:border-slate-800 h-full flex flex-col shrink-0 overflow-hidden bg-slate-50/50 dark:bg-slate-900/30'
                                        : 'w-full md:w-80 p-4 sm:p-6 md:p-8 rounded-xl border max-h-none md:max-h-[70vh] shrink-0 space-y-6 md:pr-2';
                                } catch { return 'w-full md:w-80 p-4 sm:p-6 md:p-8 rounded-xl border max-h-none md:max-h-[70vh] shrink-0 space-y-6 md:pr-2'; }
                            })()
                        }`}>
                            <form 
                                onSubmit={handleGrade} 
                                className={`flex flex-col h-full min-h-0 ${assignment.instrument_type === 'concept_map' ? '' : 'space-y-6'}`}
                            >
                                {assignment.instrument_type === 'concept_map' ? (
                                    <>
                                        <div className="flex-1 overflow-y-auto pr-1 space-y-6 min-h-0 custom-scrollbar mb-4">
                                            {/* Concept map: checklist-only grading (no numeric score input) */}
                                            <div className="space-y-4 p-5 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/15 border border-indigo-100/60 dark:border-indigo-900/35 animate-in slide-in-from-top-2 duration-200">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none">Rubrik Penilaian Peta Konsep</p>
                                                        <p className="text-[9px] text-muted-foreground font-medium mt-1">Centang kriteria yang terpenuhi — skor dihitung otomatis</p>
                                                    </div>
                                                    {/* Auto-score badge */}
                                                    <div className="flex flex-col items-center justify-center h-12 w-12 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none shrink-0">
                                                        <span className="text-lg font-black leading-none">{teacherForm.data.score}</span>
                                                        <span className="text-[7px] font-bold opacity-70 uppercase tracking-widest">skor</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    {/* Koneksi Logis */}
                                                    <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer select-none transition-all ${
                                                        conceptRubric.koneksi
                                                            ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                                                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-300'
                                                    }`}>
                                                        <input 
                                                            type="checkbox"
                                                            checked={conceptRubric.koneksi}
                                                            onChange={(e) => handleRubricCheckboxChange('koneksi', e.target.checked)}
                                                            className="sr-only"
                                                        />
                                                        <div className={`h-5 w-5 rounded-lg flex items-center justify-center shrink-0 border-2 transition-all ${
                                                            conceptRubric.koneksi
                                                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                                                : 'border-slate-300 dark:border-slate-600'
                                                        }`}>
                                                            {conceptRubric.koneksi && <CheckCircle2 className="h-3.5 w-3.5" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-xs font-bold leading-none ${ conceptRubric.koneksi ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200' }`}>Koneksi Logis</p>
                                                            <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Hubungan antar kata kunci terjalin logis</p>
                                                        </div>
                                                        {conceptRubric.koneksi && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                                                    </label>

                                                    {/* Kata Hubung Tepat */}
                                                    <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer select-none transition-all ${
                                                        conceptRubric.kataHubung
                                                            ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                                                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-300'
                                                    }`}>
                                                        <input 
                                                            type="checkbox"
                                                            checked={conceptRubric.kataHubung}
                                                            onChange={(e) => handleRubricCheckboxChange('kataHubung', e.target.checked)}
                                                            className="sr-only"
                                                        />
                                                        <div className={`h-5 w-5 rounded-lg flex items-center justify-center shrink-0 border-2 transition-all ${
                                                            conceptRubric.kataHubung
                                                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                                                : 'border-slate-300 dark:border-slate-600'
                                                        }`}>
                                                            {conceptRubric.kataHubung && <CheckCircle2 className="h-3.5 w-3.5" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-xs font-bold leading-none ${ conceptRubric.kataHubung ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200' }`}>Kata Hubung Tepat</p>
                                                            <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Kata sambung di garis panah tepat makna</p>
                                                        </div>
                                                        {conceptRubric.kataHubung && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                                                    </label>

                                                    {/* Kelengkapan Materi */}
                                                    <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer select-none transition-all ${
                                                        conceptRubric.kelengkapan
                                                            ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                                                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-300'
                                                    }`}>
                                                        <input 
                                                            type="checkbox"
                                                            checked={conceptRubric.kelengkapan}
                                                            onChange={(e) => handleRubricCheckboxChange('kelengkapan', e.target.checked)}
                                                            className="sr-only"
                                                        />
                                                        <div className={`h-5 w-5 rounded-lg flex items-center justify-center shrink-0 border-2 transition-all ${
                                                            conceptRubric.kelengkapan
                                                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                                                : 'border-slate-300 dark:border-slate-600'
                                                        }`}>
                                                            {conceptRubric.kelengkapan && <CheckCircle2 className="h-3.5 w-3.5" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-xs font-bold leading-none ${ conceptRubric.kelengkapan ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200' }`}>Kelengkapan Materi</p>
                                                            <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Semua kata kunci utama disajikan lengkap</p>
                                                        </div>
                                                        {conceptRubric.kelengkapan && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                                                    </label>
                                                </div>

                                                {/* Status KKTP */}
                                                <div className="pt-3 border-t border-indigo-100/50 dark:border-indigo-900/30 flex items-center justify-between">
                                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Status Penilaian:</span>
                                                    {(() => {
                                                        const checkedCount = [conceptRubric.koneksi, conceptRubric.kataHubung, conceptRubric.kelengkapan].filter(Boolean).length;
                                                        const isPassed = checkedCount >= 2;
                                                        return checkedCount === 0 ? (
                                                            <span className="text-[9px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md uppercase tracking-wider">Belum Dinilai</span>
                                                        ) : isPassed ? (
                                                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded-md uppercase tracking-wider">Tuntas ({checkedCount}/3)</span>
                                                        ) : (
                                                            <span className="text-[9px] font-black text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-2 py-1 rounded-md uppercase tracking-wider">Belum Tuntas ({checkedCount}/3)</span>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Umpan Balik Kualitatif</label>
                                                <textarea 
                                                    rows={4}
                                                    placeholder="Tuliskan masukan untuk pengembangan murid..."
                                                    value={teacherForm.data.feedback}
                                                    onChange={(e) => teacherForm.setData('feedback', e.target.value)}
                                                    className="w-full rounded-md border border-slate-200 bg-white px-5 py-4 text-xs font-medium outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 transition-all resize-none shadow-sm"
                                                ></textarea>
                                            </div>
                                        </div>

                                        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-transparent">
                                            <button 
                                                type="submit"
                                                disabled={teacherForm.processing}
                                                className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 py-4 text-xs font-black text-white shadow-xl shadow-sky-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest"
                                            >
                                                {teacherForm.processing ? 'Menyimpan...' : 'Simpan Penilaian'}
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setSelectedSubmission(null)}
                                                className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest hover:bg-slate-50 transition-all text-center block"
                                            >
                                                Tutup
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {['reflective_journal', 'self_assessment', 'peer_assessment', 'structured_assignment', 'exit_ticket'].includes(assignment.instrument_type) ? (
                                            <div className="space-y-6">
                                                {/* KKTP Approach: Criteria Description */}
                                                {(() => {
                                                    const gradingApproach = getGradingApproach();
                                                    const items = (
                                                        assignment.instrument_type === 'self_assessment' || 
                                                        assignment.instrument_type === 'peer_assessment' || 
                                                        assignment.instrument_type === 'structured_assignment' ||
                                                        (assignment.instrument_type === 'exit_ticket' && assignment.instrument_config?.assessment_mode === 'checklist')
                                                    )
                                                        ? (assignment.instrument_config?.indicators || [])
                                                        : (assignment.instrument_config?.questions || []);
                                                    
                                                    if (gradingApproach === 'criteria_description') {
                                                        return (
                                                            <div className="space-y-4 p-5 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/15 border border-indigo-100/60 dark:border-indigo-900/35">
                                                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1">Capaian Indikator (KKTP)</p>
                                                                <p className="text-[9px] text-muted-foreground font-medium mb-3">Tandai indikator yang dicapai secara memadai oleh siswa</p>
                                                                
                                                                <div className="space-y-3">
                                                                    {items.map((item: any, idx: number) => {
                                                                        const checked = journalCheckedIndicators[idx] || false;
                                                                        return (
                                                                            <label key={idx} className="flex items-start gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                                                                                <input 
                                                                                    type="checkbox"
                                                                                    checked={checked}
                                                                                    onChange={(e) => handleJournalCheckboxChange(idx, e.target.checked)}
                                                                                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                                                                />
                                                                                <div>
                                                                                    <p className="leading-snug">{(assignment.instrument_type === 'reflective_journal' || (assignment.instrument_type === 'exit_ticket' && assignment.instrument_config?.assessment_mode !== 'checklist')) ? `Pertanyaan ${idx + 1}` : `Indikator ${idx + 1}`}</p>
                                                                                    <p className="text-[9px] text-muted-foreground font-medium mt-0.5 line-clamp-2 leading-relaxed">{item.text || item.name}</p>
                                                                                </div>
                                                                            </label>
                                                                        );
                                                                    })}
                                                                </div>

                                                                <div className="pt-4 border-t border-indigo-100/50 dark:border-indigo-900/30 flex items-center justify-between">
                                                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Status KKTP:</span>
                                                                    {(() => {
                                                                        const total = items.length;
                                                                        const minCriteria = assignment.instrument_config?.kktp?.min_criteria ?? Math.max(1, Math.round(total / 2));
                                                                        const checkedCount = Object.values(journalCheckedIndicators).filter(Boolean).length;
                                                                        const isPassed = checkedCount >= minCriteria;
                                                                        return isPassed ? (
                                                                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded-md uppercase tracking-wider">Tuntas ({checkedCount}/{total})</span>
                                                                        ) : (
                                                                            <span className="text-[9px] font-black text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-2 py-1 rounded-md uppercase tracking-wider">Belum Tuntas ({checkedCount}/{total})</span>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        );
                                                    } else {
                                                        return (
                                                            <div className="space-y-4 p-5 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/15 border border-indigo-100/60 dark:border-indigo-900/35">
                                                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1">Kategori Capaian KKTP</p>
                                                                <p className="text-[9px] text-muted-foreground font-medium mb-3">Pilih tingkat capaian siswa</p>
                                                                
                                                                <div className="grid grid-cols-1 gap-2">
                                                                    {(assignment.instrument_config?.levels || [
                                                                        { name: 'Perlu Bimbingan', desc: 'Siswa belum menunjukkan pemahaman konsep dasar.' },
                                                                        { name: 'Cukup', desc: 'Siswa memahami sebagian besar konsep dasar namun belum konsisten.' },
                                                                        { name: 'Baik', desc: 'Siswa menguasai seluruh indikator ketuntasan dengan baik.' },
                                                                        { name: 'Sangat Baik', desc: 'Siswa menunjukkan penguasaan luar biasa dan pemahaman mendalam.' }
                                                                    ]).map((lvl: any, idx: number) => {
                                                                        const isSelected = journalSelectedLevel === lvl.name;
                                                                        return (
                                                                            <button
                                                                                key={idx}
                                                                                type="button"
                                                                                onClick={() => handleJournalLevelChange(lvl.name)}
                                                                                className={`p-3 rounded-xl border text-left transition-all ${
                                                                                    isSelected 
                                                                                        ? 'border-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20 shadow-sm' 
                                                                                        : 'border-border bg-white dark:bg-slate-900 hover:border-slate-300'
                                                                                }`}
                                                                            >
                                                                                <p className="text-xs font-bold text-foreground leading-none">{lvl.name}</p>
                                                                                <p className="text-[9px] text-muted-foreground mt-1.5 leading-normal">{lvl.desc}</p>
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>

                                                                <div className="pt-4 border-t border-indigo-100/50 dark:border-indigo-900/30 flex items-center justify-between">
                                                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Status KKTP:</span>
                                                                    {(() => {
                                                                        const levelName = journalSelectedLevel;
                                                                        const levels = assignment.instrument_config?.levels || [];
                                                                        const selectedLvlObj = levels.find((l: any) => l.name === levelName);
                                                                        const passingLvlObj = levels.find((l: any) => l.name === assignment.instrument_config?.kktp?.passing_level);
                                                                        
                                                                        let isPassed = true;
                                                                        if (passingLvlObj && levelName) {
                                                                            const selectedIdx = levels.findIndex((l: any) => l.name === levelName);
                                                                            const passingIdx = levels.findIndex((l: any) => l.name === assignment.instrument_config?.kktp?.passing_level);
                                                                            isPassed = selectedIdx >= passingIdx;
                                                                        }
                                                                        
                                                                        return levelName ? (
                                                                            isPassed ? (
                                                                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded-md uppercase tracking-wider">Tuntas</span>
                                                                            ) : (
                                                                                <span className="text-[9px] font-black text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-2 py-1 rounded-md uppercase tracking-wider">Belum Tuntas</span>
                                                                            )
                                                                        ) : (
                                                                            <span className="text-[9px] font-black text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2 py-1 rounded-md uppercase tracking-wider">Pilih Kategori</span>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                })()}
                                            </div>
                                        ) : (
                                            // Other types: numeric score input
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Skor Pencapaian (0-{assignment.max_points})</label>
                                                <input 
                                                    type="number"
                                                    max={assignment.max_points}
                                                    min={0}
                                                    value={teacherForm.data.score}
                                                    onChange={(e) => teacherForm.setData('score', parseInt(e.target.value))}
                                                    className="w-full rounded-xl border border-slate-100 bg-white px-5 py-4 text-xl font-black text-slate-800 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 transition-all text-center"
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Umpan Balik Kualitatif</label>
                                            <textarea 
                                                rows={6}
                                                placeholder="Tuliskan masukan untuk pengembangan murid..."
                                                value={teacherForm.data.feedback}
                                                onChange={(e) => teacherForm.setData('feedback', e.target.value)}
                                                className="w-full rounded-xl border border-slate-100 bg-white px-5 py-4 text-xs font-medium outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 transition-all resize-none"
                                            ></textarea>
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            {(!(assignment.instrument_config?.questions && assignment.instrument_config.questions.length > 0 && assignment.instrument_config.questions.every((q: any) => q.type === 'multiple_choice'))) && (
                                                <button 
                                                    type="submit"
                                                    disabled={teacherForm.processing}
                                                    className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 py-4 text-xs font-black text-white shadow-xl shadow-sky-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest"
                                                >
                                                    {teacherForm.processing ? 'Menyimpan...' : 'Simpan Penilaian'}
                                                </button>
                                            )}
                                            <button 
                                                type="button"
                                                onClick={() => setSelectedSubmission(null)}
                                                className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest hover:bg-slate-50 transition-all"
                                            >
                                                {(!(assignment.instrument_config?.questions && assignment.instrument_config.questions.length > 0 && assignment.instrument_config.questions.every((q: any) => q.type === 'multiple_choice'))) ? 'Tutup' : 'Selesai'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                title="Hapus Asesmen"
                message="Peringatan! Menghapus data ini akan ikut MENGHAPUS SEMUA data terkait (misal: pengumpulan siswa, nilai, remedial, dll) secara permanen."
                onConfirm={handleDelete}
                requireInput="DELETE"
                inputPlaceholder="Ketik DELETE untuk konfirmasi"
            />

            <KktpModal
                isOpen={isKktpModalOpen}
                onClose={() => setIsKktpModalOpen(false)}
                assignment={assignment}
            />

            <Dialog open={submitSuccess} onOpenChange={setSubmitSuccess}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Berhasil</DialogTitle>
                        <DialogDescription>Jawaban berhasil dikirim!</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end">
                        <Button variant="default" onClick={() => setSubmitSuccess(false)}>
                            Tutup
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={submitError !== null} onOpenChange={(open) => { if (!open) setSubmitError(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Gagal</DialogTitle>
                        <DialogDescription>{submitError}</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end">
                        <Button variant="destructive" onClick={() => setSubmitError(null)}>
                            Tutup
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    </AppLayout>
);
}

// Custom CSS for scrollbar
const scrollbarStyles = `
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
.dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }
`;
