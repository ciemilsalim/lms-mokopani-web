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
    FileText
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
    formative: { id: number; score: any; type: string }[];
    sumatif_akhir: number;
    average: number;
    description: string;
}

interface GradebookShowProps {
    summative_headers: Header[];
    other_headers: Header[];
    gradeData: StudentGrade[];
    period: string;
}

export default function GradebookShow({ summative_headers, other_headers, gradeData, period }: GradebookShowProps) {
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'summative' | 'formative'>('summative');
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Alur Asesmen Detail – LMS Mokopani`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Header Actions */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <button 
                            onClick={() => window.history.back()}
                            className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Kembali
                        </button>
                        <h1 className="text-xl font-bold text-foreground">Alur Asesmen Terpadu</h1>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{period}</p>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href={`/gradebook/learning-report/${encodeURIComponent(classId)}/${encodeURIComponent(subjectId)}`}
                            className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/10 transition dark:border-primary/30 dark:bg-primary/5 dark:text-primary"
                        >
                            <FileText className="h-4 w-4" />
                            Laporan CP
                        </Link>
                        <Link 
                            href={`/gradebook/final-report?class_id=${classId}&subject_id=${subjectId}`}
                            className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/20 transition dark:border-primary/30 dark:bg-primary/10 dark:text-primary"
                        >
                            <FileText className="h-4 w-4" />
                            Laporan Akhir
                        </Link>
                    </div>
                </div>

                {/* View Switcher & Search */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
                    <div className="flex p-1 bg-muted rounded-2xl w-fit">
                        <button 
                            onClick={() => setViewMode('summative')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition ${viewMode === 'summative' ? 'bg-white text-primary shadow-sm dark:bg-popover' : 'text-muted-foreground'}`}
                        >
                            <GraduationCap className="h-4 w-4" />
                            Asesmen Sumatif
                        </button>
                        <button 
                            onClick={() => setViewMode('formative')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition ${viewMode === 'formative' ? 'bg-white text-warning shadow-sm dark:bg-popover' : 'text-muted-foreground'}`}
                        >
                            <Target className="h-4 w-4" />
                            Formatif & Awal
                        </button>
                    </div>
                    
                    <div className="relative flex-1 md:max-w-xs">
                        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Cari nama siswa..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-2xl border border-border bg-white px-11 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:bg-popover dark:text-slate-200 shadow-sm"
                        />
                    </div>
                </div>

                {/* Main Table */}
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm dark:shadow-none">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/60 dark:bg-muted/20">
                                    <th className="sticky left-0 z-10 bg-muted/60 dark:bg-muted/20 px-6 py-5 font-bold text-foreground min-w-[200px]">Nama Siswa</th>
                                    
                                    {viewMode === 'summative' ? (
                                        summative_headers.map(h => (
                                            <th key={h.id} className="px-6 py-5 font-bold text-foreground min-w-[140px] text-center border-l border-border">
                                                <div className="flex flex-col gap-0.5" title={h.tp_desc || ''}>
                                                    <span className="truncate max-w-[120px] mx-auto">{h.title}</span>
                                                    <span className="text-[10px] font-bold text-primary uppercase">{h.tp}</span>
                                                    {h.tp_desc && (
                                                        <span className="text-[9px] font-medium text-muted-foreground line-clamp-2 max-w-[130px] mx-auto leading-tight">{h.tp_desc}</span>
                                                    )}
                                                </div>
                                            </th>
                                        ))
                                    ) : (
                                        other_headers.map(h => (
                                            <th key={h.id} className="px-6 py-5 font-bold text-foreground min-w-[140px] text-center border-l border-border">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="truncate max-w-[120px] mx-auto">{h.title}</span>
                                                    <span className={`text-[10px] font-bold uppercase ${h.type === 'initial' ? 'text-primary' : 'text-warning'}`}>
                                                        {h.type}
                                                    </span>
                                                </div>
                                            </th>
                                        ))
                                    )}

                                    {viewMode === 'summative' && (
                                        <>
                                            <th className="px-6 py-5 font-bold text-primary min-w-[120px] text-center border-l border-border bg-primary/5">Sumatif Akhir</th>
                                            <th className="px-6 py-5 font-bold text-primary min-w-[100px] text-center border-l border-border bg-primary/5">Nilai Akhir</th>
                                            <th className="px-6 py-5 font-bold text-success min-w-[300px] border-l border-border bg-success/5">Capaian Kompetensi (Rapor)</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan={100} className="px-6 py-16 text-center text-muted-foreground text-sm italic">
                                            Belum ada data siswa atau tugas untuk ditampilkan.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map((d) => (
                                        <tr key={d.student_id} className="hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors">
                                            <td className="sticky left-0 z-10 bg-card px-6 py-4 font-medium">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-muted/50 dark:text-foreground/80">
                                                        <User className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-foreground">{d.student_name}</span>
                                                        <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">{d.student_nis || '-'}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {viewMode === 'summative' ? (
                                                d.summative.map((s, idx) => (
                                                    <td key={idx} className="px-6 py-4 text-center border-l border-border">
                                                        <span className={`text-sm font-bold ${s.score === '-' ? 'text-muted-foreground/30' : 'text-foreground'}`}>
                                                            {s.score}
                                                        </span>
                                                    </td>
                                                ))
                                            ) : (
                                                d.formative.map((s, idx) => (
                                                    <td key={idx} className="px-6 py-4 text-center border-l border-border">
                                                        <span className={`text-sm font-bold ${s.score === '-' ? 'text-muted-foreground/30' : 'text-foreground'}`}>
                                                            {s.score}
                                                        </span>
                                                    </td>
                                                ))
                                            )}

                                            {viewMode === 'summative' && (
                                                <>
                                                    <td className="px-6 py-4 text-center border-l border-border bg-primary/5">
                                                        <input 
                                                            type="number"
                                                            value={localScores[d.student_id] ?? ''}
                                                            placeholder="0"
                                                            className="w-16 bg-background dark:bg-popover border border-border rounded-lg px-2 py-1 text-center text-xs font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                                            onChange={(e) => updateSumatifAkhir(d.student_id, Number(e.target.value))}
                                                            onBlur={(e) => saveSumatifAkhir(d.student_id, Number(e.target.value))}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 text-center border-l border-border bg-primary/5 font-bold text-primary dark:text-primary-hover">
                                                        {Math.round((d.average + (localScores[d.student_id] || 0)) / ((localScores[d.student_id] ?? 0) > 0 ? 2 : 1))}
                                                    </td>
                                                    <td className="px-6 py-4 border-l border-border bg-success/5">
                                                        <p className="text-[11px] leading-relaxed text-foreground/90 font-medium italic dark:text-slate-200">
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

                {/* Legend */}
                <div className="grid gap-6 md:grid-cols-4">
                    <div className="flex items-start gap-4 rounded-2xl bg-primary/5 p-4">
                        <Info className="h-5 w-5 text-primary mt-1" />
                        <div>
                            <p className="text-xs font-bold text-primary uppercase">Asesmen Awal</p>
                            <p className="text-[10px] text-primary/70">Digunakan untuk melihat kesiapan belajar siswa sebelum materi dimulai.</p>
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
