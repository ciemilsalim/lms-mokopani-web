import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
    X,
    GraduationCap,
    Award,
    CheckCircle2,
    AlertCircle,
    Clock,
    FileText,
    ExternalLink,
    SlidersHorizontal,
    RotateCcw,
    Loader2,
    Check,
    Search,
    BookOpen,
    Target,
    Layers
} from 'lucide-react';
import { router } from '@inertiajs/react';

interface PortfolioItem {
    id: number;
    title: string;
    assessment_type: string;
    instrument_type?: string;
    tp_code: string;
    tp_description: string;
    due_date?: string;
    max_points: number;
    kktp: number;
    score: number | null;
    is_passed: boolean | null;
    submitted_at: string | null;
    feedback: string | null;
    has_submission: boolean;
    file_path: string | null;
    is_remedial_open: boolean;
    remedial_status?: string | null;
    remedial_score?: number | null;
}

interface PortfolioData {
    student: {
        id: number;
        name: string;
        nis: string;
        photo_url?: string | null;
        class_name: string;
        class_id?: number;
    };
    subjects: { id: number; name: string }[];
    active_subject: { id: number; name: string } | null;
    kktp: number;
    period: string;
    portfolio: PortfolioItem[];
    summary: {
        total_assignments: number;
        total_submitted: number;
        total_graded: number;
        average_score: number;
        passed_count: number;
        remedial_count: number;
        unsubmitted_count: number;
    };
}

interface StudentPortfolioDrawerProps {
    studentId: number | null;
    initialSubjectId?: number | null;
    onClose: () => void;
}

export function StudentPortfolioDrawer({
    studentId,
    initialSubjectId,
    onClose,
}: StudentPortfolioDrawerProps) {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<PortfolioData | null>(null);
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(initialSubjectId ?? null);
    const [filterTab, setFilterTab] = useState<'all' | 'summative' | 'formative' | 'remedial'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!studentId) {
            setData(null);
            return;
        }

        let isMounted = true;
        setLoading(true);

        const url = `/gradebook/student-portfolio/${studentId}${selectedSubjectId ? `?subject_id=${selectedSubjectId}` : ''}`;
        axios.get(url)
            .then((res) => {
                if (isMounted) {
                    setData(res.data);
                    if (!selectedSubjectId && res.data.active_subject) {
                        setSelectedSubjectId(res.data.active_subject.id);
                    }
                }
            })
            .catch((err) => {
                console.error('Failed to load student portfolio', err);
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [studentId, selectedSubjectId]);

    const filteredItems = useMemo(() => {
        if (!data?.portfolio) return [];
        return data.portfolio.filter((item) => {
            if (filterTab === 'summative' && item.assessment_type !== 'summative') return false;
            if (filterTab === 'formative' && !['formative', 'initial'].includes(item.assessment_type)) return false;
            if (filterTab === 'remedial') {
                const needsRemedial = (item.score !== null && !item.is_passed) || item.is_remedial_open;
                if (!needsRemedial) return false;
            }

            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const matchTitle = item.title.toLowerCase().includes(query);
                const matchTp = (item.tp_code || '').toLowerCase().includes(query) || (item.tp_description || '').toLowerCase().includes(query);
                return matchTitle || matchTp;
            }

            return true;
        });
    }, [data?.portfolio, filterTab, searchQuery]);

    if (!studentId) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="relative w-full max-w-xl h-full bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-border/80 flex items-start justify-between gap-3 bg-muted/20">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-base shadow-xs overflow-hidden border border-primary/20">
                            {data?.student.photo_url ? (
                                <img src={data.student.photo_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                                (data?.student.name || 'S').slice(0, 2).toUpperCase()
                            )}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                                    {data?.student.class_name || 'Kelas'}
                                </span>
                                <span className="text-[11px] font-mono text-muted-foreground font-semibold">
                                    NIS: {data?.student.nis || '—'}
                                </span>
                            </div>
                            <h2 className="text-base sm:text-lg font-black text-foreground truncate mt-0.5">
                                {data?.student.name || 'Memuat Siswa...'}
                            </h2>
                            <p className="text-[11px] text-muted-foreground font-medium">
                                Portofolio Capaian Asesmen Belajar · {data?.period || ''}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition shrink-0"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                    {loading && !data ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-2 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-xs font-bold">Memuat hasil asesmen belajar siswa...</p>
                        </div>
                    ) : !data ? (
                        <div className="p-8 text-center text-xs text-muted-foreground">
                            Gagal memuat portofolio siswa. Silakan coba lagi.
                        </div>
                    ) : (
                        <>
                            {/* Subject Switcher Pills (If Teacher Teaches Multiple Subjects) */}
                            {data.subjects.length > 1 && (
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                        Mata Pelajaran:
                                    </span>
                                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                                        {data.subjects.map((sub) => {
                                            const isSelected = selectedSubjectId === sub.id;
                                            return (
                                                <button
                                                    key={sub.id}
                                                    type="button"
                                                    onClick={() => setSelectedSubjectId(sub.id)}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer border ${
                                                        isSelected
                                                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                                            : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border'
                                                    }`}
                                                >
                                                    {sub.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Summary KPI Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-center">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Rata-rata</p>
                                    <p className="text-xl font-black text-primary mt-0.5">{data.summary.average_score}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-center">
                                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Tuntas</p>
                                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{data.summary.passed_count}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/15 text-center">
                                    <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Remedial</p>
                                    <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{data.summary.remedial_count}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-muted/40 border border-border text-center">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Terkumpul</p>
                                    <p className="text-xl font-black text-foreground mt-0.5">{data.summary.total_submitted} / {data.summary.total_assignments}</p>
                                </div>
                            </div>

                            {/* Search & Tabs */}
                            <div className="space-y-2 pt-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Cari judul asesmen atau TP..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>

                                <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-xs">
                                    {[
                                        { id: 'all' as const, label: 'Semua', count: data.portfolio.length },
                                        { id: 'summative' as const, label: 'Sumatif TP', count: data.portfolio.filter(p => p.assessment_type === 'summative').length },
                                        { id: 'formative' as const, label: 'Formatif & Awal', count: data.portfolio.filter(p => ['formative', 'initial'].includes(p.assessment_type)).length },
                                        { id: 'remedial' as const, label: 'Remedial', count: data.summary.remedial_count },
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setFilterTab(tab.id)}
                                            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 cursor-pointer border ${
                                                filterTab === tab.id
                                                    ? 'bg-foreground text-background border-foreground shadow-xs'
                                                    : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border'
                                            }`}
                                        >
                                            <span>{tab.label}</span>
                                            <span className="ml-1 opacity-70 text-[10px]">({tab.count})</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Portfolio Assessment Cards List */}
                            <div className="space-y-2.5">
                                {filteredItems.length === 0 ? (
                                    <div className="p-8 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                                        Tidak ada asesmen yang sesuai dengan filter ini.
                                    </div>
                                ) : (
                                    filteredItems.map((item) => {
                                        const hasScore = item.score !== null;
                                        return (
                                            <div 
                                                key={item.id} 
                                                className="p-3.5 rounded-xl border border-border bg-card shadow-xs space-y-2 hover:border-primary/40 transition"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="space-y-0.5 min-w-0 flex-1">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                                                                {item.tp_code}
                                                            </span>
                                                            <span className="text-[10px] font-medium text-muted-foreground">
                                                                {item.assessment_type === 'summative' ? 'Sumatif' : item.assessment_type === 'initial' ? 'Asesmen Awal' : 'Formatif'}
                                                            </span>
                                                        </div>
                                                        <h4 className="text-xs sm:text-sm font-bold text-foreground leading-snug">
                                                            {item.title}
                                                        </h4>
                                                    </div>

                                                    {/* Score & Status Badge */}
                                                    <div className="text-right shrink-0">
                                                        {hasScore ? (
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-base sm:text-lg font-black text-foreground">
                                                                    {item.score}
                                                                </span>
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                                                    item.is_passed 
                                                                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                                                                        : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                                                }`}>
                                                                    {item.is_passed ? '✓ Tuntas' : '⚠️ Remedial'}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                                                                Belum Ada Nilai
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Details Row: Submission, File, Feedback */}
                                                <div className="pt-1.5 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                                                    <div className="flex items-center gap-2">
                                                        <span>Kumpul: <strong>{item.submitted_at || 'Belum'}</strong></span>
                                                        {item.file_path && (
                                                            <a
                                                                href={item.file_path.startsWith('http') ? item.file_path : `/storage/${item.file_path}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-primary hover:underline font-bold inline-flex items-center gap-0.5"
                                                            >
                                                                <span>Berkas</span>
                                                                <ExternalLink className="h-2.5 w-2.5" />
                                                            </a>
                                                        )}
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            onClose();
                                                            router.visit(route('assignments.grade-view', {
                                                                assignment: item.id,
                                                                student_id: data.student.id,
                                                                class_id: data.student.class_id,
                                                            }));
                                                        }}
                                                        className="inline-flex items-center gap-1 font-bold text-primary hover:underline cursor-pointer"
                                                    >
                                                        <SlidersHorizontal className="h-3 w-3" />
                                                        <span>Periksa / Nilai</span>
                                                    </button>
                                                </div>

                                                {item.feedback && (
                                                    <div className="text-[11px] text-foreground italic bg-muted/20 p-2 rounded-lg border border-border/40">
                                                        Catatan Guru: "{item.feedback}"
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border/80 bg-muted/20 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">
                        KKTP Standar: <strong className="text-primary font-bold">{data?.kktp ?? 75}</strong>
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xs hover:bg-primary/90 transition cursor-pointer"
                    >
                        Tutup Portofolio
                    </button>
                </div>
            </div>
        </div>
    );
}

