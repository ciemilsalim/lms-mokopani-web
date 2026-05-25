import { Link } from '@inertiajs/react';
import {
    CheckCircle2, Lock, PlayCircle, ClipboardList, ChevronRight,
    XCircle, Clock, Star, AlertCircle, Info, BookOpen
} from 'lucide-react';
import { useState } from 'react';

interface LearningItem {
    id: number;
    title: string;
    type: 'material' | 'assignment';
    file_type?: string | null;
    assessment_type?: string;
    is_submitted?: boolean;
    is_graded?: boolean;
    is_passed?: boolean;
    is_completed?: boolean;
    score?: number | null;
    attempts?: number;
}

interface TPNodeProps {
    tp: {
        id: number;
        code: string;
        description: string;
        items: LearningItem[];
        is_completed: boolean;
    };
    index: number;
    isAccessible: boolean;
    isMastered?: boolean;
    total: number;
}

export default function TPNode({ tp, index, isAccessible, isMastered, total }: TPNodeProps) {
    const [expanded, setExpanded] = useState(false);

    const isCompleted = tp.is_completed;
    const statusIcon = isCompleted ? CheckCircle2 : isMastered ? Star : !isAccessible ? Lock : null;
    const StatusIcon = statusIcon;

    return (
        <div className="relative">
            {/* Node circle + connector */}
            <div className="flex items-start gap-6">
                {/* Timeline node */}
                <div className="relative flex flex-col items-center">
                    <button
                        onClick={() => isAccessible && setExpanded(!expanded)}
                        className={`relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-4 transition-all duration-500 ${
                            isCompleted
                                ? 'border-emerald-200 bg-emerald-500 text-white shadow-lg shadow-emerald-200/50 dark:border-emerald-800 dark:shadow-emerald-900/30'
                                : isMastered
                                ? 'border-sky-200 bg-sky-500 text-white shadow-lg shadow-sky-200/50 dark:border-sky-800 dark:shadow-sky-900/30'
                                : isAccessible
                                ? 'border-primary/30 bg-card text-primary shadow-lg shadow-primary/10 hover:scale-105 hover:border-primary/60'
                                : 'border-border bg-muted text-muted-foreground'
                        } ${isAccessible ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    >
                        {StatusIcon ? (
                            <StatusIcon className={`h-6 w-6 ${isCompleted || isMastered ? 'animate-in zoom-in-50 duration-300' : ''}`} />
                        ) : (
                            <span className="text-lg font-black">{index + 1}</span>
                        )}
                    </button>
                    {index < total - 1 && (
                        <div className={`absolute top-14 h-full w-1 rounded-full ${
                            isCompleted || isMastered ? 'bg-emerald-200 dark:bg-emerald-900' : 'bg-muted'
                        }`} />
                    )}
                </div>

                {/* Content card */}
                <div className={`flex-1 min-w-0 transition-all duration-300 ${
                    !isAccessible ? 'opacity-40' : ''
                }`}>
                    <div
                        onClick={() => isAccessible && setExpanded(!expanded)}
                        className={`cursor-pointer overflow-hidden rounded-2xl border transition-all duration-200 ${
                            isCompleted
                                ? 'border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-card dark:border-emerald-900/30 dark:from-emerald-950/10'
                                : isMastered
                                ? 'border-sky-200 bg-gradient-to-r from-sky-50/50 to-card dark:border-sky-900/30 dark:from-sky-950/10'
                                : isAccessible
                                ? 'border-border bg-card hover:border-primary/30 hover:shadow-md'
                                : 'border-border bg-muted/30'
                        }`}
                    >
                        <div className="p-5">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${
                                    isCompleted ? 'text-emerald-600 dark:text-emerald-400' :
                                    isMastered ? 'text-sky-600 dark:text-sky-400' :
                                    isAccessible ? 'text-primary' : 'text-muted-foreground'
                                }`}>
                                    TP {tp.code}
                                </span>
                                {isCompleted && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                        <CheckCircle2 className="h-2.5 w-2.5" /> Tuntas
                                    </span>
                                )}
                                {isMastered && !isCompleted && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                                        <Star className="h-2.5 w-2.5" /> Mastered
                                    </span>
                                )}
                                {!isAccessible && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter text-muted-foreground">
                                        <Lock className="h-2.5 w-2.5" /> Terkunci
                                    </span>
                                )}
                            </div>
                            <h3 className={`text-base font-bold leading-tight ${
                                isAccessible ? 'text-foreground' : 'text-muted-foreground'
                            }`}>{tp.description}</h3>

                            {/* Quick status summary */}
                            <div className="mt-3 flex items-center gap-3 text-[10px] font-bold text-muted-foreground">
                                <span>{tp.items.filter(i => i.type === 'material').length} Materi</span>
                                <span>{tp.items.filter(i => i.type === 'assignment').length} Tugas</span>
                                {isAccessible && (
                                    <span className="ml-auto flex items-center gap-1 text-primary">
                                        {expanded ? 'Tutup' : 'Detail'}
                                        <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Expanded items */}
                    {expanded && isAccessible && (
                        <div className="mt-2 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                            {tp.items.map((item) => {
                                const isMaterial = item.type === 'material';
                                const url = isMaterial ? route('materials.show', item.id) : route('assignments.show', item.id);

                                return (
                                    <Link
                                        key={`${item.type}-${item.id}`}
                                        href={url}
                                        className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 p-3.5 transition-all hover:border-primary/30 hover:shadow-sm hover:bg-card"
                                    >
                                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ${
                                            isMaterial ? 'bg-primary/10 text-primary' :
                                            item.assessment_type === 'initial' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                            item.assessment_type === 'summative' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' :
                                            'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                        }`}>
                                            {isMaterial ? <PlayCircle className="h-4.5 w-4.5" /> : <ClipboardList className="h-4.5 w-4.5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-1">{item.title}</p>
                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter mt-0.5">
                                                {isMaterial ? (item.file_type || 'Materi Digital') :
                                                 item.assessment_type === 'initial' ? 'Asesmen Diagnostik' :
                                                 item.assessment_type === 'summative' ? 'Asesmen Sumatif' : 'Asesmen Formatif'}
                                            </p>
                                        </div>
                                        {item.type === 'assignment' && item.is_submitted && (
                                            <div className="flex flex-col items-end gap-0.5 shrink-0">
                                                {item.is_graded ? (
                                                    item.is_passed ? (
                                                        <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">
                                                            <CheckCircle2 className="h-3 w-3" /> Tuntas
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-tighter">
                                                            <XCircle className="h-3 w-3" /> Remedial
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="flex items-center gap-1 text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-tighter">
                                                        <Clock className="h-3 w-3" /> Periksa
                                                    </span>
                                                )}
                                                {item.score !== null && (
                                                    <span className="text-[10px] font-black text-muted-foreground">{item.score}</span>
                                                )}
                                            </div>
                                        )}
                                        {item.type === 'material' && item.is_completed && (
                                            <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter shrink-0">
                                                <CheckCircle2 className="h-3 w-3" /> Selesai
                                            </span>
                                        )}
                                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-0.5" />
                                    </Link>
                                );
                            })}
                            {tp.items.length === 0 && (
                                <p className="p-6 text-center text-sm text-muted-foreground italic">Belum ada konten untuk tahap ini.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
