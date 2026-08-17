import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { 
    ChevronLeft, 
    Printer, 
    Search,
    User,
    Target,
    GraduationCap,
    Info,
    CheckCircle2,
    FileText,
    ClipboardCheck
} from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Penilaian', href: '/gradebook' },
    { title: 'Alur Asesmen Detail', href: '#' },
];

interface Header {
    id: number;
    title: string;
    tp?: string;
    tp_desc?: string;
    type?: string;
    max?: number;
}

interface StudentGrade {
    student_id: number;
    student_name: string;
    student_nis?: string;
    summative: { tp_id: number; score: any; tp_code: string }[];
    initial: { id: number; score: any; type: string }[];
    formative: { id: number; score: any; type: string }[];
    sumatif_akhir: number;
    average: number;
    description: string;
}

interface GradebookShowProps {
    summative_headers: Header[];
    initial_headers: Header[];
    formative_headers: Header[];
    gradeData: StudentGrade[];
    period: string;
}

export default function GradebookShow({ summative_headers, initial_headers, formative_headers, gradeData, period }: GradebookShowProps) {
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'summative' | 'formative' | 'initial'>('summative');
    const [localScores, setLocalScores] = useState<Record<number, number>>(() => {
        const init: Record<number, number> = {};
        gradeData.forEach(d => { if (d.sumatif_akhir) init[d.student_id] = d.sumatif_akhir; });
        return init;
    });

    const updateSumatifAkhir = (studentId: number, value: number) => {
        setLocalScores(prev => ({ ...prev, [studentId]: value }));
    };

    const saveSumatifAkhir = (studentId: number, value: number) => {
        const token = decodeURIComponent((document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/) || [])[1] || '');
        fetch(route('gradebook.final-score.update'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': token },
            body: JSON.stringify({
                student_id: studentId,
                subject_id: subjectId,
                class_id: classId,
                score: value,
            }),
        });
    };

    const filteredData = gradeData.filter(d => 
        d.student_name.toLowerCase().includes(search.toLowerCase())
    );

    const classId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('class_id') : '';
    const subjectId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('subject_id') : '';

    // Get headers and data for current viewMode
    const getCurrentHeaders = () => {
        if (viewMode === 'summative') return summative_headers;
        if (viewMode === 'initial') return initial_headers;
        return formative_headers;
    };

    const getCurrentScores = (d: StudentGrade) => {
        if (viewMode === 'initial') return d.initial;
        return d.formative;
    };

    const tabs = [
        { key: 'summative' as const, label: 'Asesmen Sumatif', icon: GraduationCap, activeColor: 'text-primary', count: summative_headers.length },
        { key: 'formative' as const, label: 'Asesmen Formatif', icon: Target, activeColor: 'text-warning', count: formative_headers.length },
        { key: 'initial' as const, label: 'Asesmen Awal', icon: ClipboardCheck, activeColor: 'text-emerald-600 dark:text-emerald-400', count: initial_headers.length },
    ];

    const [mobileLayout, setMobileLayout] = useState<'cards' | 'table'>('cards');
    const [expandedStudentIds, setExpandedStudentIds] = useState<Record<number, boolean>>({});

    const toggleStudentExpand = (id: number) => {
        setExpandedStudentIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Alur Asesmen Detail – LMS Mokopani`} />

            <div className="flex h-full flex-1 flex-col gap-5 sm:gap-6 min-w-0 fade-in pb-12 md:pb-0">
                {/* Header Actions */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <button 
                            onClick={() => window.history.back()}
                            className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition active:scale-95"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Kembali
                        </button>
                        <h1 className="text-lg sm:text-xl font-black text-foreground">Alur Asesmen Terpadu</h1>
                        <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest">{period}</p>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href={`/gradebook/learning-report/${encodeURIComponent(classId || '')}/${encodeURIComponent(subjectId || '')}`}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition active:scale-95"
                        >
                            <FileText className="h-3.5 w-3.5" />
                            Laporan CP
                        </Link>
                        <Link 
                            href={`/gradebook/final-report?class_id=${classId}&subject_id=${subjectId}`}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary text-primary-foreground px-3.5 py-2 text-xs font-bold shadow-xs hover:bg-primary/90 transition active:scale-95"
                        >
                            <FileText className="h-3.5 w-3.5" />
                            Rapor Akhir
                        </Link>
                    </div>
                </div>

                {/* View Switcher & Search */}
                <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between">
                    <div className="flex p-1 bg-muted/70 rounded-2xl w-full sm:w-fit overflow-x-auto scrollbar-thin border border-border/50">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = viewMode === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setViewMode(tab.key)}
                                    className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 flex-1 sm:flex-initial ${
                                        isActive ? `bg-card ${tab.activeColor} shadow-xs` : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                    <span>{tab.label}</span>
                                    {tab.count > 0 && (
                                        <span className={`ml-1 text-[10px] font-bold rounded-full px-1.5 py-0.2 ${isActive ? 'bg-current/10' : 'bg-muted-foreground/15'}`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {/* Mobile Cards vs Table layout switcher */}
                        <div className="md:hidden flex p-1 bg-muted/60 rounded-xl border border-border/50 shrink-0">
                            <button
                                type="button"
                                onClick={() => setMobileLayout('cards')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                                    mobileLayout === 'cards' ? 'bg-card text-primary shadow-xs' : 'text-muted-foreground'
                                }`}
                            >
                                Kartu
                            </button>
                            <button
                                type="button"
                                onClick={() => setMobileLayout('table')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                                    mobileLayout === 'table' ? 'bg-card text-primary shadow-xs' : 'text-muted-foreground'
                                }`}
                            >
                                Tabel
                            </button>
                        </div>

                        <div className="relative flex-1 md:max-w-xs">
                            <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Cari nama siswa..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full rounded-xl border border-border bg-card px-9 py-2 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-xs"
                            />
                        </div>
                    </div>
                </div>

                {/* ── Mobile Card View (md:hidden when mobileLayout === 'cards') ── */}
                <div className={`${mobileLayout === 'cards' ? 'block' : 'hidden'} md:hidden space-y-3`}>
                    {filteredData.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground text-xs italic bg-card rounded-2xl border border-border/60 p-6">
                            Belum ada data nilai siswa untuk ditampilkan.
                        </div>
                    ) : (
                        filteredData.map((d) => {
                            const isExpanded = expandedStudentIds[d.student_id];
                            const currentHeaders = getCurrentHeaders();
                            const finalScore = Math.round((d.average + (localScores[d.student_id] || 0)) / ((localScores[d.student_id] ?? 0) > 0 ? 2 : 1));

                            return (
                                <div key={d.student_id} className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xs shrink-0">
                                                {d.student_name.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-bold text-foreground text-sm truncate">{d.student_name}</span>
                                                <span className="text-[10px] font-mono text-muted-foreground font-semibold">NIS: {d.student_nis || '-'}</span>
                                            </div>
                                        </div>

                                        {viewMode === 'summative' && (
                                            <div className="text-right shrink-0">
                                                <span className="text-[10px] font-bold text-muted-foreground block uppercase">Nilai Akhir</span>
                                                <span className="text-base font-black text-primary">{finalScore}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Sumatif Akhir Input for teacher */}
                                    {viewMode === 'summative' && (
                                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/40">
                                            <span className="text-xs font-bold text-muted-foreground">Input Sumatif Akhir:</span>
                                            <input
                                                type="number"
                                                value={localScores[d.student_id] ?? ''}
                                                placeholder="0"
                                                className="w-16 h-8 bg-card border border-border rounded-lg text-center text-xs font-black text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                                                onChange={(e) => updateSumatifAkhir(d.student_id, Number(e.target.value))}
                                                onBlur={(e) => saveSumatifAkhir(d.student_id, Number(e.target.value))}
                                            />
                                        </div>
                                    )}

                                    {/* Expandable Breakdown Button */}
                                    <button
                                        type="button"
                                        onClick={() => toggleStudentExpand(d.student_id)}
                                        className="w-full flex items-center justify-between pt-2 border-t border-border/50 text-xs font-bold text-primary active:opacity-70"
                                    >
                                        <span>Rincian Nilai ({currentHeaders.length} Asesmen)</span>
                                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Expanded Detail */}
                                    {isExpanded && (
                                        <div className="pt-2 space-y-2.5 text-xs animate-in fade-in">
                                            <div className="grid grid-cols-2 gap-2">
                                                {viewMode === 'summative' ? (
                                                    d.summative.map((s, idx) => (
                                                        <div key={idx} className="p-2 rounded-xl bg-muted/30 border border-border/40">
                                                            <p className="text-[10px] font-bold text-muted-foreground truncate">{summative_headers[idx]?.title || `TP ${idx + 1}`}</p>
                                                            <p className="text-xs font-black text-foreground mt-0.5">{s.score}</p>
                                                        </div>
                                                    ))
                                                ) : (
                                                    getCurrentScores(d).map((s, idx) => (
                                                        <div key={idx} className="p-2 rounded-xl bg-muted/30 border border-border/40">
                                                            <p className="text-[10px] font-bold text-muted-foreground truncate">{currentHeaders[idx]?.title || `Asesmen ${idx + 1}`}</p>
                                                            <p className="text-xs font-black text-foreground mt-0.5">{s.score}</p>
                                                        </div>
                                                    ))
                                                )}
                                            </div>

                                            {viewMode === 'summative' && d.description && (
                                                <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-900/40 space-y-1">
                                                    <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Capaian Kompetensi (Rapor):</p>
                                                    <p className="text-[11px] text-indigo-900 dark:text-indigo-200 leading-snug italic">{d.description}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* ── Main Table View (Desktop ALWAYS visible, Mobile only when mobileLayout === 'table') ── */}
                <div className={`${mobileLayout === 'table' ? 'block' : 'hidden'} md:block overflow-hidden rounded-2xl md:rounded-xl border border-border bg-card shadow-none`}>
                    <div className="overflow-x-auto scrollbar-thin">
                        <table className="w-full text-left text-[13px]">
                            <thead>
                                <tr className="bg-muted/30">
                                    <th className="sticky left-0 z-30 bg-card px-3 sm:px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground min-w-[140px] sm:min-w-[200px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-border">Nama Siswa</th>
                                    
                                    {viewMode === 'summative' ? (
                                        summative_headers.map(h => (
                                            <th key={h.id} className="px-3 py-3 min-w-[120px] text-center">
                                                <div className="flex flex-col gap-0.5" title={h.tp_desc || ''}>
                                                    <span className="truncate max-w-[120px] mx-auto text-[11px] font-bold text-foreground">{h.title}</span>
                                                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{h.tp}</span>
                                                    {h.tp_desc && (
                                                        <span className="text-[9px] font-medium text-muted-foreground line-clamp-1 max-w-[130px] mx-auto leading-tight">{h.tp_desc}</span>
                                                    )}
                                                </div>
                                            </th>
                                        ))
                                    ) : (
                                        getCurrentHeaders().map(h => (
                                            <th key={h.id} className="px-3 py-3 min-w-[120px] text-center">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="truncate max-w-[120px] mx-auto text-[11px] font-bold text-foreground">{h.title}</span>
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${viewMode === 'initial' ? 'text-emerald-600 dark:text-emerald-400' : 'text-warning'}`}>
                                                        {viewMode === 'initial' ? 'Awal' : 'Formatif'}
                                                    </span>
                                                </div>
                                            </th>
                                        ))
                                    )}

                                    {viewMode === 'summative' && (
                                        <>
                                            <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-primary min-w-[120px] text-center bg-primary/5">Sumatif Akhir</th>
                                            <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-primary min-w-[100px] text-center bg-primary/5">Nilai Akhir</th>
                                            <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-success min-w-[300px] bg-success/5">Capaian Kompetensi (Rapor)</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="">
                                {filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan={100} className="px-6 py-16 text-center text-muted-foreground text-sm italic">
                                            {viewMode === 'initial' && initial_headers.length === 0
                                                ? 'Belum ada asesmen awal untuk mata pelajaran ini.'
                                                : viewMode === 'formative' && formative_headers.length === 0
                                                ? 'Belum ada asesmen formatif untuk mata pelajaran ini.'
                                                : 'Belum ada data siswa atau tugas untuk ditampilkan.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map((d, idx) => (
                                        <tr key={d.student_id} className={`group transition-colors hover:bg-popover dark:hover:bg-popover ${idx % 2 === 1 ? 'bg-muted/10' : ''}`}>
                                            <td className="sticky left-0 z-20 px-3 sm:px-4 py-2 font-medium bg-card shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-l-2 border-transparent group-hover:border-primary border-r border-border">
                                                <div className="flex items-center gap-2 sm:gap-3">
                                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-muted/50 dark:text-foreground/80 shrink-0 hidden sm:flex">
                                                        <User className="h-3.5 w-3.5" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-foreground text-[13px]">{d.student_name}</span>
                                                        <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">{d.student_nis || '-'}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {viewMode === 'summative' ? (
                                                d.summative.map((s, idx) => (
                                                    <td key={idx} className="px-3 py-2 text-center group-hover:bg-popover">
                                                        <span className={`text-[13px] font-bold ${s.score === '-' ? 'text-muted-foreground/30' : 'text-foreground'}`}>
                                                            {s.score}
                                                        </span>
                                                    </td>
                                                ))
                                            ) : (
                                                getCurrentScores(d).map((s, idx) => (
                                                    <td key={idx} className="px-3 py-2 text-center group-hover:bg-popover">
                                                        <span className={`text-[13px] font-bold ${s.score === '-' ? 'text-muted-foreground/30' : 'text-foreground'}`}>
                                                            {s.score}
                                                        </span>
                                                    </td>
                                                ))
                                            )}

                                            {viewMode === 'summative' && (
                                                <>
                                                    <td className="px-3 py-2 text-center bg-primary/5 group-hover:bg-primary/10">
                                                        <input 
                                                            type="number"
                                                            value={localScores[d.student_id] ?? ''}
                                                            placeholder="0"
                                                            className="w-14 bg-background dark:bg-popover border-transparent rounded-md px-1 py-0.5 text-center text-xs font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all hover:border-border"
                                                            onChange={(e) => updateSumatifAkhir(d.student_id, Number(e.target.value))}
                                                            onBlur={(e) => saveSumatifAkhir(d.student_id, Number(e.target.value))}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 text-center bg-primary/5 font-bold text-primary dark:text-primary-hover group-hover:bg-primary/10">
                                                        {Math.round((d.average + (localScores[d.student_id] || 0)) / ((localScores[d.student_id] ?? 0) > 0 ? 2 : 1))}
                                                    </td>
                                                    <td className="px-4 py-2 bg-success/5 group-hover:bg-success/10">
                                                        <div className="flex items-start gap-2.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 p-2 border-0">
                                                            <Info className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400 mt-0.5" />
                                                            <p className="text-[11px] leading-snug text-indigo-800 dark:text-indigo-300 font-medium italic line-clamp-2" title={d.description}>
                                                                {d.description}
                                                            </p>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Empty state for non-summative tabs with no data */}
                {viewMode !== 'summative' && getCurrentHeaders().length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 py-16 px-6">
                        {viewMode === 'initial' ? (
                            <>
                                <ClipboardCheck className="h-12 w-12 text-emerald-400/50 mb-4" />
                                <p className="text-sm font-bold text-muted-foreground">Belum Ada Asesmen Awal</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">Asesmen awal digunakan untuk memetakan kesiapan belajar siswa sebelum materi dimulai.</p>
                            </>
                        ) : (
                            <>
                                <Target className="h-12 w-12 text-warning/50 mb-4" />
                                <p className="text-sm font-bold text-muted-foreground">Belum Ada Asesmen Formatif</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">Asesmen formatif digunakan untuk memantau proses belajar siswa secara berkelanjutan.</p>
                            </>
                        )}
                    </div>
                )}

                {/* Legend */}
                <div className="grid gap-6 md:grid-cols-4">
                    <div className="flex items-start gap-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 p-4">
                        <ClipboardCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-1" />
                        <div>
                            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase">Asesmen Awal</p>
                            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-500/70">Digunakan untuk melihat kesiapan belajar siswa sebelum materi dimulai.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 rounded-2xl bg-warning/10 p-4">
                        <Target className="h-5 w-5 text-warning mt-1" />
                        <div>
                            <p className="text-xs font-bold text-warning uppercase">Formatif</p>
                            <p className="text-[10px] text-warning/70">Proses pemantauan belajar. Nilai tidak dihitung dalam rata-rata rapor.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 rounded-2xl bg-primary/5 p-4">
                        <GraduationCap className="h-5 w-5 text-primary mt-1" />
                        <div>
                            <p className="text-xs font-bold text-primary uppercase">Sumatif</p>
                            <p className="text-[10px] text-primary/70">Penilaian akhir lingkup materi yang menjadi dasar nilai rapor.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 rounded-2xl bg-success/10 p-4">
                        <CheckCircle2 className="h-5 w-5 text-success mt-1" />
                        <div>
                            <p className="text-xs font-bold text-success uppercase">Deskripsi Rapor</p>
                            <p className="text-[10px] text-success/70">Dihasilkan secara otomatis berdasarkan penguasaan TP tertinggi & terendah.</p>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
