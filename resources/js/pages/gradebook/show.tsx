import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { 
    ChevronLeft, 
    Search,
    User,
    Target,
    GraduationCap,
    Info,
    CheckCircle2,
    FileText,
    ClipboardCheck,
    ChevronDown
} from 'lucide-react';
import { useState } from 'react';
import { StudentGradeCard, GradeSummary } from '@/components/gradebook';

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

export default function GradebookShow({ summative_headers = [], initial_headers = [], formative_headers = [], gradeData = [], period }: GradebookShowProps) {
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
        d.student_name.toLowerCase().includes(search.toLowerCase()) ||
        (d.student_nis && d.student_nis.toLowerCase().includes(search.toLowerCase()))
    );

    const classId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('class_id') : '';
    const subjectId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('subject_id') : '';

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
        { key: 'summative' as const, label: 'Asesmen Sumatif', icon: GraduationCap, activeColor: 'text-primary', count: summative_headers.length },
        { key: 'formative' as const, label: 'Asesmen Formatif', icon: Target, activeColor: 'text-warning', count: formative_headers.length },
        { key: 'initial' as const, label: 'Asesmen Awal', icon: ClipboardCheck, activeColor: 'text-emerald-600 dark:text-emerald-400', count: initial_headers.length },
    ];

    const [mobileLayout, setMobileLayout] = useState<'cards' | 'table'>('cards');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Alur Asesmen Detail – LMS Mokopani`} />

            <div className="space-y-5 sm:space-y-6 fade-in pb-16 md:pb-6 max-w-7xl mx-auto px-4 sm:px-6">
                {/* Header Actions */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
                    <div>
                        <button 
                            onClick={() => window.history.back()}
                            className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition active:scale-95"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span>Kembali ke Daftar Kelas</span>
                        </button>
                        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">Gradebook Penilaian Kelas</h1>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">{period}</p>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href={`/gradebook/learning-report/${encodeURIComponent(classId || '')}/${encodeURIComponent(subjectId || '')}`}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3.5 py-2.5 text-xs font-bold text-primary hover:bg-primary/20 transition active:scale-95 min-h-[44px]"
                        >
                            <FileText className="h-4 w-4" />
                            <span>Laporan CP</span>
                        </Link>
                        <Link 
                            href={`/gradebook/final-report?class_id=${classId}&subject_id=${subjectId}`}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-xs font-bold shadow-xs hover:bg-primary/90 transition active:scale-95 min-h-[44px]"
                        >
                            <FileText className="h-4 w-4" />
                            <span>Rapor Akhir</span>
                        </Link>
                    </div>
                </div>

                {/* Grade Summary Cards */}
                <GradeSummary
                    classAverage={classAvg}
                    totalStudents={gradeData.length}
                    kktp={75}
                    highestScore={maxScore}
                    lowestScore={minScore}
                />

                {/* View Switcher & Search Bar */}
                <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between">
                    <div className="flex p-1 bg-muted/70 rounded-2xl w-full sm:w-fit overflow-x-auto scrollbar-none border border-border/50">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = viewMode === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setViewMode(tab.key)}
                                    className={`flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 flex-1 sm:flex-initial min-h-[44px] ${
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
                                className="w-full rounded-xl border border-border bg-card px-9 py-2.5 text-xs font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs min-h-[44px]"
                            />
                        </div>
                    </div>
                </div>

                {/* ── Mobile Student Grade Card Feed View ── */}
                <div className={`${mobileLayout === 'cards' ? 'block' : 'hidden'} md:hidden space-y-3`}>
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

                {/* ── Main Table View (Desktop ALWAYS visible, Mobile only when mobileLayout === 'table') ── */}
                <div className={`${mobileLayout === 'table' ? 'block' : 'hidden'} md:block overflow-hidden rounded-2xl border border-border bg-card shadow-2xs`}>
                    <div className="overflow-x-auto scrollbar-thin">
                        <table className="w-full text-left text-[13px]">
                            <thead>
                                <tr className="bg-muted/30 border-b border-border/60">
                                    <th className="sticky left-0 z-30 bg-card px-4 py-3.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground min-w-[200px] border-r border-border">
                                        Nama Siswa
                                    </th>
                                    
                                    {viewMode === 'summative' ? (
                                        summative_headers.map(h => (
                                            <th key={h.id} className="px-3 py-3 min-w-[120px] text-center border-r border-border/40">
                                                <div className="flex flex-col gap-0.5" title={h.tp_desc || ''}>
                                                    <span className="truncate max-w-[120px] mx-auto text-[11px] font-bold text-foreground">{h.title}</span>
                                                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{h.tp}</span>
                                                </div>
                                            </th>
                                        ))
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

                                    {viewMode === 'summative' && (
                                        <>
                                            <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-primary min-w-[130px] text-center bg-primary/5 border-r border-border/40">Sumatif Akhir</th>
                                            <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-primary min-w-[100px] text-center bg-primary/5 border-r border-border/40">Nilai Akhir</th>
                                            <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 min-w-[300px] bg-emerald-500/5">Capaian Kompetensi (Rapor)</th>
                                        </>
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

                                            {viewMode === 'summative' ? (
                                                d.summative.map((s, sIdx) => (
                                                    <td key={sIdx} className="px-3 py-3 text-center border-r border-border/40">
                                                        <span className={`text-xs font-bold ${s.score === '-' ? 'text-muted-foreground/30' : 'text-foreground'}`}>
                                                            {s.score}
                                                        </span>
                                                    </td>
                                                ))
                                            ) : (
                                                getCurrentScores(d).map((s, sIdx) => (
                                                    <td key={sIdx} className="px-3 py-3 text-center border-r border-border/40">
                                                        <span className={`text-xs font-bold ${s.score === '-' ? 'text-muted-foreground/30' : 'text-foreground'}`}>
                                                            {s.score}
                                                        </span>
                                                    </td>
                                                ))
                                            )}

                                            {viewMode === 'summative' && (
                                                <>
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
                                                        {localScores[d.student_id] ?? Math.round(d.average)}
                                                    </td>
                                                    <td className="px-4 py-3 bg-emerald-500/5">
                                                        <p className="text-[11px] leading-relaxed text-foreground font-medium italic line-clamp-2" title={d.description}>
                                                            {d.description}
                                                        </p>
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

                {/* Legend Guidelines */}
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                    <div className="flex items-start gap-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3.5">
                        <ClipboardCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Asesmen Awal</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Melihat kesiapan belajar siswa sebelum materi dimulai.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3.5">
                        <Target className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">Formatif</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Memantau proses belajar secara berkelanjutan.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl bg-primary/10 border border-primary/20 p-3.5">
                        <GraduationCap className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-primary uppercase">Sumatif</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Penilaian akhir yang menjadi dasar utama nilai rapor.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 p-3.5">
                        <CheckCircle2 className="h-5 w-5 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase">Deskripsi Rapor</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Dihasilkan otomatis berdasarkan penguasaan TP terendah & tertinggi.</p>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
