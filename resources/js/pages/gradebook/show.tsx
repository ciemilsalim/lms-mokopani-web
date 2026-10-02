import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { 
    ChevronLeft, 
    Search,
    Target,
    GraduationCap,
    CheckCircle2,
    ClipboardCheck,
    SlidersHorizontal,
    Award,
    Printer,
    FileSpreadsheet,
    Calculator
} from 'lucide-react';
import { StudentGradeCard, GradeSummary } from '@/components/gradebook';

interface Header {
    id: number | string;
    title: string;
    tp?: string;
    tp_desc?: string;
    type?: string;
    max?: number;
    has_assignment?: boolean;
}

interface StudentGrade {
    student_id: number;
    student_name: string;
    student_nis?: string;
    summative: { tp_id: number | string; score: any; tp_code: string; title?: string; submitted?: boolean; has_assignment?: boolean }[];
    initial: { id: number; score: any; type: string; title?: string }[];
    formative: { id: number; score: any; type: string; title?: string }[];
    total_sumatif?: number;
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
    subject_name?: string;
    class_name?: string;
    teacher_name?: string;
    subject_id?: number;
    class_id?: number;
    kktp?: number;
    school_name?: string;
    school_address?: string;
    headmaster_name?: string;
    headmaster_nip?: string;
}

export default function GradebookShow({ 
    summative_headers = [], 
    initial_headers = [], 
    formative_headers = [], 
    gradeData = [], 
    period = '',
    subject_name = '',
    class_name = '',
    teacher_name = '',
    subject_id,
    class_id,
    kktp = 75,
    school_name = '',
    school_address = '',
    headmaster_name = '',
    headmaster_nip = ''
}: GradebookShowProps) {
    // Robust fallback for query parameters if not passed directly
    const effectiveClassId = class_id ?? (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('class_id') : '');
    const effectiveSubjectId = subject_id ?? (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('subject_id') : '');

    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'summative' | 'formative' | 'initial' | 'recap'>('summative');
    const [mobileLayout, setMobileLayout] = useState<'cards' | 'table'>('cards');
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
                subject_id: effectiveSubjectId,
                class_id: effectiveClassId,
                score: value,
            }),
        });
    };

    const filteredData = gradeData.filter(d => 
        d.student_name.toLowerCase().includes(search.toLowerCase()) ||
        (d.student_nis && d.student_nis.toLowerCase().includes(search.toLowerCase()))
    );

    // Calculate class stats for GradeSummary
    const allAverages = gradeData.map(d => d.average).filter(Boolean);
    const classAvg = allAverages.length > 0 ? Math.round(allAverages.reduce((a, b) => a + b, 0) / allAverages.length) : 0;
    const maxScore = allAverages.length > 0 ? Math.max(...allAverages) : 0;
    const minScore = allAverages.length > 0 ? Math.min(...allAverages) : 0;

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
        { key: 'summative' as const, label: 'Asesmen Sumatif (TP)', icon: GraduationCap, activeColor: 'text-primary', count: summative_headers.length },
        { key: 'formative' as const, label: 'Asesmen Formatif', icon: Target, activeColor: 'text-warning', count: formative_headers.length },
        { key: 'initial' as const, label: 'Asesmen Awal', icon: ClipboardCheck, activeColor: 'text-emerald-600 dark:text-emerald-400', count: initial_headers.length },
        { key: 'recap' as const, label: 'Rekap Nilai (Formatif & Sumatif)', icon: FileSpreadsheet, activeColor: 'text-indigo-600 dark:text-indigo-400', count: gradeData.length },
    ];

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Nilai & Rapor', href: '/gradebook' },
        { title: class_name ? `Buku Nilai ${class_name}` : 'Buku Nilai', href: '#' },
    ];

    const currentDateStr = new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).format(new Date());

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Buku Nilai ${subject_name} (${class_name}) – LMS Mokopani`} />

            {/* Custom Print Styles for High-Quality Landscape Output */}
            <style>{`
                @media print {
                    @page {
                        size: landscape;
                        margin: 8mm;
                    }
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    .print\\:block {
                        display: block !important;
                    }
                }
            `}</style>

            <div className="space-y-4 sm:space-y-5 fade-in pb-24 sm:pb-8 max-w-7xl mx-auto w-full min-w-0 print:p-0 print:m-0">
                {/* 1. Top Navigation & Action Buttons (Hidden on Print) */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1 print:hidden">
                    <div>
                        <Link 
                            href={route('gradebook.index')}
                            className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition active:scale-95"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span>Kembali ke Pilih Kelas</span>
                        </Link>
                        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                            <SlidersHorizontal className="h-6 w-6 text-primary shrink-0" />
                            <span>Buku Nilai Harian Asesmen</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
                            {subject_name || 'Mata Pelajaran'} · {class_name ? `Kelas ${class_name}` : 'Kelas'} • {period}
                        </p>
                    </div>

                    {/* Action Group: Buku Nilai <-> Rapor Akhir + Cetak Nilai */}
                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                        <div className="flex items-center gap-1.5 p-1 bg-muted/80 rounded-2xl border border-border/60">
                            <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-card text-primary shadow-xs">
                                <SlidersHorizontal className="h-4 w-4" />
                                <span>Buku Nilai</span>
                            </div>
                            <Link
                                href={route('gradebook.final-report', { class_id: effectiveClassId, subject_id: effectiveSubjectId })}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-card/50 transition cursor-pointer"
                            >
                                <Award className="h-4 w-4 text-primary" />
                                <span>Rapor Akhir</span>
                            </Link>
                        </div>

                        {/* Button Cetak Nilai */}
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition active:scale-95 cursor-pointer min-h-[40px]"
                            title="Cetak Nilai Formatif & Sumatif"
                            aria-label="Cetak Nilai"
                        >
                            <Printer className="h-4 w-4" />
                            <span>Cetak Nilai</span>
                        </button>
                    </div>
                </div>

                {/* 2. Grade Summary Statistics Cards (Hidden on Print) */}
                <div className="print:hidden">
                    <GradeSummary
                        classAverage={classAvg}
                        totalStudents={gradeData.length}
                        kktp={kktp}
                        highestScore={maxScore}
                        lowestScore={minScore}
                    />
                </div>

                {/* 3. View Mode Switcher (Sumatif / Formatif / Awal / Rekap) & Search Bar (Hidden on Print) */}
                <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between print:hidden">
                    <div className="flex p-1 bg-muted/70 rounded-2xl w-full sm:w-fit overflow-x-auto scrollbar-none border border-border/50">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = viewMode === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setViewMode(tab.key)}
                                    className={`flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 flex-1 sm:flex-initial min-h-[40px] cursor-pointer ${
                                        isActive ? `bg-card ${tab.activeColor} shadow-xs` : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{tab.label}</span>
                                    {tab.count > 0 && (
                                        <span className={`ml-1 text-[10px] font-bold rounded-full px-2 py-0.5 ${isActive ? 'bg-primary/10' : 'bg-muted-foreground/15'}`}>
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
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition min-h-[38px] ${
                                    mobileLayout === 'cards' ? 'bg-card text-primary shadow-xs' : 'text-muted-foreground'
                                }`}
                            >
                                Kartu
                            </button>
                            <button
                                type="button"
                                onClick={() => setMobileLayout('table')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition min-h-[38px] ${
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
                                placeholder="Cari nama atau NIS siswa..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full rounded-xl border border-border bg-card px-9 py-2.5 text-xs font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs min-h-[40px]"
                            />
                        </div>
                    </div>
                </div>

                {/* 4. Mobile Student Grade Card Feed View (Hidden on Print) */}
                <div className={`${mobileLayout === 'cards' ? 'block' : 'hidden'} md:hidden space-y-3 print:hidden`}>
                    {filteredData.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground text-xs italic bg-card rounded-2xl border border-border/60 p-6">
                            Belum ada data nilai siswa untuk ditampilkan.
                        </div>
                    ) : (
                        filteredData.map((d) => (
                            <StudentGradeCard
                                key={d.student_id}
                                studentId={d.student_id}
                                studentName={d.student_name}
                                studentNis={d.student_nis}
                                summative={d.summative}
                                initial={d.initial}
                                formative={d.formative}
                                totalSumatif={d.total_sumatif}
                                sumatifAkhir={localScores[d.student_id] ?? d.sumatif_akhir}
                                average={d.average}
                                description={d.description}
                                onSaveSumatifAkhir={(stId, val) => {
                                    updateSumatifAkhir(stId, val);
                                    saveSumatifAkhir(stId, val);
                                }}
                            />
                        ))
                    )}
                </div>

                {/* 5. Main Screen Table View (Desktop & Mobile-Table, Hidden on Print) */}
                <div className={`${mobileLayout === 'table' ? 'block' : 'hidden'} md:block overflow-hidden rounded-2xl border border-border bg-card shadow-2xs print:hidden`}>
                    <div className="overflow-x-auto scrollbar-thin">
                        <table className="w-full text-left text-[13px]">
                            <thead>
                                <tr className="bg-muted/30 border-b border-border/60">
                                    <th className="sticky left-0 z-30 bg-card px-4 py-3.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground min-w-[200px] border-r border-border">
                                        Nama Siswa
                                    </th>

                                    {/* Mode: Rekap Nilai Lengkap (Formatif & Sumatif Sesuai Kebutuhan Cetak) */}
                                    {viewMode === 'recap' ? (
                                        <>
                                            {formative_headers.map((h, idx) => (
                                                <th key={`f_${h.id}`} className="px-3 py-3 min-w-[90px] text-center border-r border-border/40 bg-amber-500/5">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">F{idx + 1}</span>
                                                        <span className="truncate max-w-[100px] mx-auto text-[10px] text-muted-foreground" title={h.title}>{h.title}</span>
                                                    </div>
                                                </th>
                                            ))}
                                            {summative_headers.map((h, idx) => (
                                                <th key={`s_${h.id}`} className="px-3 py-3 min-w-[90px] text-center border-r border-border/40 bg-primary/5">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{h.tp || `S${idx + 1}`}</span>
                                                        <span className="truncate max-w-[100px] mx-auto text-[10px] text-muted-foreground" title={h.tp_desc || h.title}>{h.title}</span>
                                                    </div>
                                                </th>
                                            ))}
                                            <th className="px-3 py-3 text-[11px] font-black uppercase tracking-wider text-primary min-w-[110px] text-center bg-primary/10 border-r border-border/40">
                                                Total Sumatif
                                            </th>
                                            <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-foreground min-w-[90px] text-center bg-muted/40 border-r border-border/40">
                                                Rata-rata
                                            </th>
                                        </>
                                    ) : viewMode === 'summative' ? (
                                        <>
                                            {summative_headers.map(h => (
                                                <th key={h.id} className="px-3 py-3 min-w-[120px] text-center border-r border-border/40">
                                                    <div className="flex flex-col gap-0.5" title={h.tp_desc || ''}>
                                                        <span className="truncate max-w-[120px] mx-auto text-[11px] font-bold text-foreground">{h.title}</span>
                                                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{h.tp}</span>
                                                    </div>
                                                </th>
                                            ))}
                                            <th className="px-3 py-3 text-[11px] font-black uppercase tracking-widest text-primary min-w-[110px] text-center bg-primary/10 border-r border-border/40">
                                                Total Sumatif
                                            </th>
                                            <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-primary min-w-[120px] text-center bg-primary/5 border-r border-border/40">
                                                Sumatif Akhir
                                            </th>
                                            <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-primary min-w-[100px] text-center bg-primary/5 border-r border-border/40">
                                                Rata-rata TP
                                            </th>
                                            <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 min-w-[280px] bg-emerald-500/5">
                                                Capaian Kompetensi (Rapor)
                                            </th>
                                        </>
                                    ) : (
                                        getCurrentHeaders().map(h => (
                                            <th key={h.id} className="px-3 py-3 min-w-[120px] text-center border-r border-border/40">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="truncate max-w-[120px] mx-auto text-[11px] font-bold text-foreground">{h.title}</span>
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${viewMode === 'initial' ? 'text-emerald-600 dark:text-emerald-400' : 'text-warning'}`}>
                                                        {viewMode === 'initial' ? 'Awal' : 'Formatif'}
                                                    </span>
                                                </div>
                                            </th>
                                        ))
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan={100} className="px-6 py-16 text-center text-muted-foreground text-xs italic">
                                            Belum ada data siswa atau nilai asesmen untuk ditampilkan.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map((d, idx) => (
                                        <tr key={d.student_id} className={`group transition-colors hover:bg-muted/30 ${idx % 2 === 1 ? 'bg-muted/10' : ''}`}>
                                            <td className="sticky left-0 z-20 px-4 py-3 font-medium bg-card border-r border-border">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xs shrink-0">
                                                        {d.student_name.slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-bold text-foreground text-xs sm:text-sm truncate">{d.student_name}</span>
                                                        <span className="text-[10px] font-mono font-semibold text-muted-foreground">NIS: {d.student_nis || '-'}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Mode: Rekap Nilai Formatif & Sumatif */}
                                            {viewMode === 'recap' ? (
                                                <>
                                                    {/* Nilai Formatif (Tidak Dijumlahkan) */}
                                                    {d.formative.map((s, sIdx) => (
                                                        <td key={`rf_${sIdx}`} className="px-3 py-3 text-center border-r border-border/40 bg-amber-500/2">
                                                            <span className={`text-xs font-bold ${s.score === '-' ? 'text-muted-foreground/40' : 'text-foreground'}`}>
                                                                {s.score}
                                                            </span>
                                                        </td>
                                                    ))}
                                                    {/* Nilai Sumatif (Jika belum dikerjakan = 0) */}
                                                    {d.summative.map((s, sIdx) => (
                                                        <td key={`rs_${sIdx}`} className="px-3 py-3 text-center border-r border-border/40 bg-primary/2">
                                                            <span className={`text-xs font-bold ${s.score === '-' ? 'text-muted-foreground/40' : s.score === 0 ? 'text-amber-600 font-extrabold' : 'text-foreground'}`}>
                                                                {s.score}
                                                            </span>
                                                        </td>
                                                    ))}
                                                    {/* Total Sumatif (Akumulasi Nilai Sumatif) */}
                                                    <td className="px-3 py-3 text-center bg-primary/10 border-r border-border/40">
                                                        <span className="text-xs sm:text-sm font-black text-primary">
                                                            {d.total_sumatif ?? 0}
                                                        </span>
                                                    </td>
                                                    {/* Rata-rata Sumatif */}
                                                    <td className="px-3 py-3 text-center bg-muted/20 border-r border-border/40 font-bold text-foreground">
                                                        {Math.round(d.average)}
                                                    </td>
                                                </>
                                            ) : viewMode === 'summative' ? (
                                                <>
                                                    {d.summative.map((s, sIdx) => (
                                                        <td key={sIdx} className="px-3 py-3 text-center border-r border-border/40">
                                                            <span className={`text-xs font-bold ${s.score === '-' ? 'text-muted-foreground/30' : s.score === 0 ? 'text-amber-600 font-black' : 'text-foreground'}`}>
                                                                {s.score}
                                                            </span>
                                                        </td>
                                                    ))}
                                                    {/* Total Sumatif */}
                                                    <td className="px-3 py-3 text-center bg-primary/10 border-r border-border/40">
                                                        <span className="text-xs sm:text-sm font-black text-primary">
                                                            {d.total_sumatif ?? 0}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 text-center bg-primary/5 border-r border-border/40">
                                                        <input 
                                                            type="number"
                                                            value={localScores[d.student_id] ?? ''}
                                                            placeholder="0"
                                                            className="w-16 h-8 bg-background border border-border rounded-xl text-center text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                                            onChange={(e) => updateSumatifAkhir(d.student_id, Number(e.target.value))}
                                                            onBlur={(e) => saveSumatifAkhir(d.student_id, Number(e.target.value))}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-3 text-center bg-primary/5 font-black text-primary border-r border-border/40">
                                                        {Math.round(d.average)}
                                                    </td>
                                                    <td className="px-4 py-3 bg-emerald-500/5">
                                                        <p className="text-[11px] leading-relaxed text-foreground font-medium italic line-clamp-2" title={d.description}>
                                                            {d.description}
                                                        </p>
                                                    </td>
                                                </>
                                            ) : (
                                                getCurrentScores(d).map((s, sIdx) => (
                                                    <td key={sIdx} className="px-3 py-3 text-center border-r border-border/40">
                                                        <span className={`text-xs font-bold ${s.score === '-' ? 'text-muted-foreground/30' : 'text-foreground'}`}>
                                                            {s.score}
                                                        </span>
                                                    </td>
                                                ))
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 6. Contextual Guidelines Footer (Hidden on Print) */}
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 print:hidden">
                    <div className="flex items-start gap-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3.5">
                        <ClipboardCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Asesmen Awal</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Pemetaan kesiapan awal belajar sebelum materi TP dimulai.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3.5">
                        <Target className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">Formatif</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Pemantauan progres dan umpan balik (tidak dijumlahkan).</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl bg-primary/10 border border-primary/20 p-3.5">
                        <GraduationCap className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-primary uppercase">Sumatif (TP)</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Jika terbit belum dikerjakan bernilai 0 untuk diakumulasi.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 p-3.5">
                        <Calculator className="h-5 w-5 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase">Total Sumatif</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Akumulasi seluruh capaian nilai sumatif yang telah diterbitkan.</p>
                        </div>
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* 7. OFFICIAL PRINT DOCUMENT LAYOUT (Visible ONLY during window.print())   */}
                {/* ========================================================================= */}
                <div className="hidden print:block w-full text-black bg-white">
                    {/* Header Kop Sekolah */}
                    <div className="mb-4 border-b-4 border-double border-black pb-4 text-center">
                        {school_name && (
                            <h1 className="text-xl font-black uppercase tracking-wider text-black">{school_name}</h1>
                        )}
                        {school_address && (
                            <p className="text-xs text-gray-700 mt-0.5">{school_address}</p>
                        )}
                        <h2 className="text-base font-black uppercase tracking-widest mt-2 text-black">
                            DAFTAR NILAI ASESMEN FORMATIF & SUMATIF
                        </h2>
                        <p className="text-sm font-bold uppercase text-black mt-0.5">
                            MATA PELAJARAN: {subject_name}
                        </p>

                        {/* Metadata Grid */}
                        <div className="mt-3 grid grid-cols-4 gap-2 text-left text-xs border border-gray-400 p-2 rounded">
                            <div>
                                <span className="text-gray-600">Kelas:</span>
                                <span className="font-bold ml-1">{class_name}</span>
                            </div>
                            <div>
                                <span className="text-gray-600">Tahun/Semester:</span>
                                <span className="font-bold ml-1">{period}</span>
                            </div>
                            <div>
                                <span className="text-gray-600">Guru Pengampu:</span>
                                <span className="font-bold ml-1">{teacher_name || '-'}</span>
                            </div>
                            <div>
                                <span className="text-gray-600">KKTP / KKM:</span>
                                <span className="font-bold ml-1">{kktp}</span>
                            </div>
                        </div>
                    </div>

                    {/* Official Table */}
                    <table className="w-full text-left text-xs border-collapse border border-black">
                        <thead>
                            <tr className="bg-gray-200 text-center font-bold">
                                <th rowSpan={2} className="border border-black px-2 py-1.5 w-8">No</th>
                                <th rowSpan={2} className="border border-black px-2 py-1.5 w-24">NIS</th>
                                <th rowSpan={2} className="border border-black px-3 py-1.5 text-left">Nama Siswa</th>
                                {formative_headers.length > 0 && (
                                    <th colSpan={formative_headers.length} className="border border-black px-2 py-1 bg-amber-100/70">
                                        Nilai Formatif (Proses)
                                    </th>
                                )}
                                {summative_headers.length > 0 && (
                                    <th colSpan={summative_headers.length} className="border border-black px-2 py-1 bg-blue-100/70">
                                        Nilai Sumatif (Capaian TP)
                                    </th>
                                )}
                                <th rowSpan={2} className="border border-black px-2 py-1.5 w-20 bg-gray-300 font-black">
                                    Total Sumatif
                                </th>
                                <th rowSpan={2} className="border border-black px-2 py-1.5 w-16">
                                    Rata-rata
                                </th>
                            </tr>
                            <tr className="bg-gray-100 text-center text-[10px] font-bold">
                                {formative_headers.map((h, idx) => (
                                    <th key={`pf_${h.id}`} className="border border-black px-1.5 py-1 min-w-[36px] bg-amber-50">
                                        F{idx + 1}
                                    </th>
                                ))}
                                {summative_headers.map((h, idx) => (
                                    <th key={`ps_${h.id}`} className="border border-black px-1.5 py-1 min-w-[36px] bg-blue-50">
                                        {h.tp || `S${idx + 1}`}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {gradeData.length === 0 ? (
                                <tr>
                                    <td colSpan={3 + formative_headers.length + summative_headers.length + 2} className="border border-black px-4 py-6 text-center italic">
                                        Tidak ada data siswa untuk ditampilkan.
                                    </td>
                                </tr>
                            ) : (
                                gradeData.map((row, idx) => (
                                    <tr key={`prow_${row.student_id}`} className={idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
                                        <td className="border border-black px-2 py-1 text-center font-medium">{idx + 1}</td>
                                        <td className="border border-black px-2 py-1 text-center font-mono text-[11px]">{row.student_nis || '-'}</td>
                                        <td className="border border-black px-3 py-1 font-semibold text-left">{row.student_name}</td>
                                        
                                        {/* Nilai Formatif (Tidak Dijumlahkan) */}
                                        {row.formative.map((f, fIdx) => (
                                            <td key={`pfv_${fIdx}`} className="border border-black px-1 py-1 text-center text-[11px]">
                                                {f.score}
                                            </td>
                                        ))}

                                        {/* Nilai Sumatif (Jika belum dikerjakan = 0) */}
                                        {row.summative.map((s, sIdx) => (
                                            <td key={`psv_${sIdx}`} className="border border-black px-1 py-1 text-center text-[11px]">
                                                {s.score}
                                            </td>
                                        ))}

                                        {/* Total Sumatif (Akumulasi Nilai Sumatif) */}
                                        <td className="border border-black px-2 py-1 text-center font-black bg-gray-200/50 text-[11px]">
                                            {row.total_sumatif ?? 0}
                                        </td>

                                        {/* Rata-rata Sumatif */}
                                        <td className="border border-black px-2 py-1 text-center font-medium text-[11px]">
                                            {Math.round(row.average)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Keterangan & Aturan Nilai */}
                    <div className="mt-3 text-[11px] text-gray-700 space-y-0.5">
                        <p className="font-semibold italic">
                            * Catatan:
                        </p>
                        <p className="italic">
                            1. Asesmen formatif digunakan sebagai pemantauan proses belajar siswa dan tidak diakumulasikan.
                        </p>
                        <p className="italic">
                            2. Tugas sumatif yang telah diterbitkan namun belum dikerjakan oleh siswa dihitung bernilai 0 (nol) agar dapat diakumulasikan ke Total Sumatif.
                        </p>
                    </div>

                    {/* Tanda Tangan Resmi */}
                    <div className="mt-10 grid grid-cols-2 gap-16 text-center text-xs break-inside-avoid">
                        <div>
                            <p className="text-gray-700">Mengetahui,</p>
                            <p className="font-bold text-black">Kepala Sekolah</p>
                            <div className="h-16"></div>
                            <p className="font-bold underline text-black">{headmaster_name || '........................................'}</p>
                            {headmaster_nip && <p className="text-[11px] text-gray-700">NIP. {headmaster_nip}</p>}
                        </div>
                        <div>
                            <p className="text-gray-700">Dicetak pada: {currentDateStr}</p>
                            <p className="font-bold text-black">Guru Mata Pelajaran,</p>
                            <div className="h-16"></div>
                            <p className="font-bold underline text-black">{teacher_name || '........................................'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
