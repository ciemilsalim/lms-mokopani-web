import React, { useState, useMemo } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { PredicateBadge } from '@/components/gradebook';
import { 
    Download, 
    Printer, 
    ChevronLeft, 
    Search, 
    Users, 
    TrendingUp, 
    Award, 
    Target, 
    ChevronDown, 
    ChevronUp, 
    Sparkles, 
    CheckCircle2, 
    AlertTriangle,
    SlidersHorizontal,
    FileText,
    BookOpen,
    GraduationCap
} from 'lucide-react';

interface ReportRow {
    nis: string;
    name: string;
    final_score: number;
    description: string;
    tp_scores?: { code: string; description: string; score: number }[];
}

interface FinalReportProps {
    reportData: ReportRow[];
    subject_name: string;
    class_name: string;
    teacher_name: string;
    period: string;
    subject_id?: number;
    class_id?: number;
    kktp?: number;
    school_name?: string;
    school_address?: string;
    headmaster_name?: string;
    headmaster_nip?: string;
}

export default function FinalReport({ 
    reportData = [], 
    subject_name, 
    class_name, 
    teacher_name, 
    period, 
    subject_id, 
    class_id, 
    kktp = 75, 
    school_name, 
    school_address, 
    headmaster_name, 
    headmaster_nip 
}: FinalReportProps) {
    const [downloading, setDownloading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'passed' | 'remedial'>('all');
    const [expandedStudentIdx, setExpandedStudentIdx] = useState<number | null>(null);

    const handleDownloadPdf = () => {
        setDownloading(true);
        const url = route('rapor.download', { subject_id, class_id });
        window.open(url, '_blank');
        setTimeout(() => setDownloading(false), 2000);
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Rapor', href: '/gradebook' },
        { title: `Rapor ${class_name}`, href: '#' },
    ];

    // Summary Calculations (Source of truth from backend reportData)
    const summary = useMemo(() => {
        const scores = reportData.map(r => Number(r.final_score) || 0);
        const total = reportData.length;
        const avg = total > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / total) : 0;
        const highest = total > 0 ? Math.max(...scores) : 0;
        const passedCount = reportData.filter(r => (Number(r.final_score) || 0) >= kktp).length;
        const remedialCount = total - passedCount;

        return {
            avg,
            total,
            highest,
            passedCount,
            remedialCount,
        };
    }, [reportData, kktp]);

    // Filtered Students
    const filteredData = useMemo(() => {
        return reportData.filter(row => {
            const matchesSearch = 
                row.name.toLowerCase().includes(search.toLowerCase()) ||
                (row.nis && row.nis.toLowerCase().includes(search.toLowerCase()));

            if (!matchesSearch) return false;

            const score = Number(row.final_score) || 0;
            if (filterStatus === 'passed') return score >= kktp;
            if (filterStatus === 'remedial') return score < kktp;
            return true;
        });
    }, [reportData, search, filterStatus, kktp]);

    const toggleStudentExpand = (idx: number) => {
        setExpandedStudentIdx(prev => prev === idx ? null : idx);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Rapor Akhir ${subject_name} (${class_name}) – LMS Mokopani`} />

            <div className="space-y-4 sm:space-y-5 fade-in pb-24 sm:pb-8 max-w-7xl mx-auto w-full min-w-0 print:p-0 print:m-0">
                {/* 1. Header & Navigation Actions (Hidden on Print) */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
                    <div>
                        <Link 
                            href={route('gradebook.index')}
                            className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition active:scale-95"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span>Kembali ke Pilih Kelas</span>
                        </Link>
                        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                            <Award className="h-6 w-6 text-primary shrink-0" />
                            <span>Rapor Akhir Siswa</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
                            {subject_name} · Kelas {class_name} • {period}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {subject_id && class_id && (
                            <button
                                type="button"
                                onClick={handleDownloadPdf}
                                disabled={downloading}
                                className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition active:scale-95 disabled:opacity-50 min-h-[44px] cursor-pointer"
                                aria-label="Unduh PDF Rapor"
                            >
                                <Download className="h-4 w-4" />
                                <span>{downloading ? 'Mengunduh...' : 'Unduh PDF'}</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl border border-border bg-card text-foreground hover:bg-muted text-xs font-bold transition active:scale-95 min-h-[44px] cursor-pointer shadow-2xs"
                            aria-label="Cetak Laporan Rapor"
                        >
                            <Printer className="h-4 w-4 text-primary" />
                            <span>Cetak Rapor</span>
                        </button>
                    </div>
                </div>

                {/* 2. 2×2 Summary Grid (Prompt 12–13: Rata-rata, Total Siswa, KKTP, Tertinggi) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 print:hidden">
                    {/* Rata-rata */}
                    <div className="rounded-2xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-2xs flex items-center justify-between gap-2 min-h-[88px]">
                        <div>
                            <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Rata-rata</p>
                            <p className="text-xl sm:text-2xl font-black text-foreground mt-0.5">{summary.avg}</p>
                        </div>
                        <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                    </div>

                    {/* Total Siswa */}
                    <div className="rounded-2xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-2xs flex items-center justify-between gap-2 min-h-[88px]">
                        <div>
                            <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Siswa</p>
                            <p className="text-xl sm:text-2xl font-black text-foreground mt-0.5">{summary.total} <span className="text-xs font-normal text-muted-foreground">Siswa</span></p>
                        </div>
                        <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <Users className="h-5 w-5" />
                        </div>
                    </div>

                    {/* KKTP */}
                    <div className="rounded-2xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-2xs flex items-center justify-between gap-2 min-h-[88px]">
                        <div>
                            <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">KKTP Target</p>
                            <p className="text-xl sm:text-2xl font-black text-foreground mt-0.5">{kktp} <span className="text-xs font-normal text-muted-foreground">Poin</span></p>
                        </div>
                        <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <Target className="h-5 w-5" />
                        </div>
                    </div>

                    {/* Nilai Tertinggi */}
                    <div className="rounded-2xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-2xs flex items-center justify-between gap-2 min-h-[88px]">
                        <div>
                            <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Tertinggi</p>
                            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{summary.highest}</p>
                        </div>
                        <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <Award className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                {/* 3. Search & Filter Bar (Prompt 26–27) */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 print:hidden">
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Cari nama atau NIS..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full h-12 rounded-2xl border border-border/80 bg-card pl-10 pr-4 text-xs sm:text-sm text-foreground shadow-2xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition placeholder:text-muted-foreground"
                        />
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin shrink-0">
                        <button
                            type="button"
                            onClick={() => setFilterStatus('all')}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition min-h-[40px] shrink-0 cursor-pointer ${
                                filterStatus === 'all'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'bg-card border border-border/80 text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Semua ({reportData.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterStatus('passed')}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition min-h-[40px] shrink-0 cursor-pointer ${
                                filterStatus === 'passed'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-card border border-border/80 text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Tuntas ({summary.passedCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterStatus('remedial')}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition min-h-[40px] shrink-0 cursor-pointer ${
                                filterStatus === 'remedial'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-card border border-border/80 text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Perlu Bimbingan ({summary.remedialCount})
                        </button>
                    </div>
                </div>

                {/* 4. Student Card Feed (Mobile First & Primary Results View) */}
                <div className="space-y-3 print:hidden">
                    {filteredData.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground text-xs italic bg-card rounded-2xl border border-dashed border-border/80 p-6 space-y-1">
                            <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                            <p className="font-bold text-foreground text-sm">Tidak ada data siswa yang cocok</p>
                            <p className="text-muted-foreground">{search ? 'Coba ubah kata kunci pencarian Anda.' : 'Belum ada data nilai siswa di kelas ini.'}</p>
                        </div>
                    ) : (
                        filteredData.map((row, idx) => {
                            const isExpanded = expandedStudentIdx === idx;
                            const isPassed = (Number(row.final_score) || 0) >= kktp;
                            return (
                                <div 
                                    key={idx} 
                                    className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all duration-200 space-y-3 overflow-hidden"
                                >
                                    {/* Student Card Summary Row (76-96px target) */}
                                    <div 
                                        className="flex items-center justify-between gap-3 cursor-pointer select-none"
                                        onClick={() => toggleStudentExpand(idx)}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary font-black text-sm shrink-0 border border-primary/15 shadow-2xs">
                                                {row.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-sm sm:text-base font-bold text-foreground truncate leading-tight">{row.name}</h3>
                                                <p className="text-xs font-mono text-muted-foreground mt-0.5">NIS: {row.nis || '-'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="text-right">
                                                <span className={`text-xl sm:text-2xl font-black block leading-none ${isPassed ? 'text-foreground' : 'text-rose-600 dark:text-rose-400'}`}>
                                                    {row.final_score}
                                                </span>
                                                <div className="mt-1 flex items-center justify-end gap-1">
                                                    <PredicateBadge score={row.final_score} kktpThreshold={kktp} />
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                className="h-9 w-9 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground flex items-center justify-center transition shrink-0"
                                                aria-label={isExpanded ? 'Tutup Detail' : 'Buka Detail Siswa'}
                                                aria-expanded={isExpanded}
                                            >
                                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expandable Detail Section (Prompt 20-23: Identitas -> Nilai -> Predikat -> CP/TP -> Deskripsi) */}
                                    {isExpanded && (
                                        <div className="pt-3 border-t border-border/60 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                                            {/* Status Badge Tag */}
                                            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                                                <span className="text-muted-foreground font-semibold">Status Capaian:</span>
                                                {isPassed ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-500/20">
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                        <span>Tuntas Melebihi KKTP ({kktp})</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-500/20">
                                                        <AlertTriangle className="h-3.5 w-3.5" />
                                                        <span>Perlu Bimbingan Tambahan (&lt; {kktp})</span>
                                                    </span>
                                                )}
                                            </div>

                                            {/* Description Card */}
                                            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 text-xs space-y-1">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                                                    <span>Deskripsi Capaian Rapor</span>
                                                </p>
                                                <p className="text-xs text-foreground leading-relaxed italic">
                                                    "{row.description}"
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* 5. Document Print Layout (Preserved for Official Print & PDF) */}
                <div className="hidden print:block rounded-3xl border border-border bg-card p-8 sm:p-10 shadow-2xl print:shadow-none print:border-none print:p-0">
                    <div className="mb-8 border-b-4 border-double border-border pb-6 text-center">
                        {school_name && (
                            <>
                                <h1 className="text-2xl font-black uppercase tracking-widest text-foreground">{school_name}</h1>
                                {school_address && <p className="text-sm text-muted-foreground mt-1">{school_address}</p>}
                                <div className="mx-auto my-3 w-24 border-t-2 border-border"></div>
                            </>
                        )}
                        <h2 className="text-xl font-black uppercase tracking-widest text-foreground">Laporan Hasil Asesmen Akhir (Rapor)</h2>
                        <p className="mt-1 text-lg font-bold text-primary uppercase">{subject_name}</p>
                        <div className="mt-6 grid grid-cols-2 gap-4 text-left text-sm">
                            <div className="space-y-1">
                                <p className="text-muted-foreground">Kelas:</p>
                                <p className="font-bold text-foreground">{class_name}</p>
                            </div>
                            <div className="space-y-1 text-right">
                                <p className="text-muted-foreground">Periode:</p>
                                <p className="font-bold text-foreground">{period}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-muted-foreground">Guru Pengampu:</p>
                                <p className="font-bold text-foreground">{teacher_name}</p>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-border">
                        <table className="w-full text-left text-xs sm:text-sm">
                            <thead className="bg-muted/50 text-foreground font-bold uppercase tracking-wider border-b border-border">
                                <tr>
                                    <th className="px-4 py-3.5 w-12 text-center">No</th>
                                    <th className="px-4 py-3.5 w-28">NIS</th>
                                    <th className="px-4 py-3.5 w-56">Nama Siswa</th>
                                    <th className="px-4 py-3.5 w-24 text-center">Nilai Akhir</th>
                                    <th className="px-4 py-3.5">Deskripsi Capaian Kompetensi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {reportData.map((row, index) => (
                                    <tr key={index} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3.5 text-center text-muted-foreground font-medium">{index + 1}</td>
                                        <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">{row.nis}</td>
                                        <td className="px-4 py-3.5 font-bold text-foreground">{row.name}</td>
                                        <td className="px-4 py-3.5 text-center">
                                            <span className={`inline-block px-2.5 py-1 rounded-lg font-black text-xs ${row.final_score >= kktp ? 'text-emerald-600 bg-emerald-500/10' : 'text-rose-600 bg-rose-500/10'}`}>
                                                {row.final_score}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <p className="text-xs leading-relaxed text-foreground font-medium italic">
                                                "{row.description}"
                                            </p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-16 grid grid-cols-2 gap-20">
                        <div className="text-center">
                            <p className="text-sm font-medium text-muted-foreground">Mengetahui,</p>
                            <p className="text-sm font-bold text-foreground">Kepala Sekolah</p>
                            <div className="h-20"></div>
                            <p className="text-sm font-bold text-foreground underline">{headmaster_name || '........................................'}</p>
                            {headmaster_nip && <p className="text-xs text-muted-foreground">NIP. {headmaster_nip}</p>}
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-muted-foreground">Guru Mata Pelajaran,</p>
                            <div className="h-24"></div>
                            <p className="text-sm font-bold text-foreground underline">{teacher_name}</p>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
