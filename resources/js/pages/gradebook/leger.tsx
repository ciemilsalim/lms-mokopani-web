import React, { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Table2,
    Users,
    BookOpen,
    TrendingUp,
    AlertTriangle,
    Download,
    Search,
    ArrowLeft,
    GraduationCap,
    X,
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Nilai & Rapor', href: '/gradebook' },
    { title: 'Leger Nilai', href: '/gradebook/leger' },
];

interface LegerSubject {
    id: number;
    name: string;
    code: string | null;
    kktp: number;
}

interface LegerCellScore {
    final_score: number;
    tp_average: number | null;
    sas_score: number | null;
    has_summative_data: boolean;
    passed: boolean | null;
}

interface LegerRow {
    id: number;
    name: string;
    nis: string;
    photo_url: string | null;
    scores: Record<number, LegerCellScore>;
    overall_average: number;
    assessed_count: number;
    passed_count: number;
    below_kktp_count: number;
}

interface LegerProps {
    school_class: { id: number; name: string } | null;
    homeroom_teacher: { name: string; nip: string | null } | null;
    period: string;
    subjects: LegerSubject[];
    rows: LegerRow[];
    subject_averages: Record<number, number | null>;
    summary: {
        total_students: number;
        total_subjects: number;
        class_average: number;
        students_need_attention: number;
    };
    admin_classes?: Array<{ id: number; name: string }>;
    is_read_only?: boolean;
}

export default function GradebookLeger({
    school_class,
    homeroom_teacher,
    period,
    subjects = [],
    rows = [],
    subject_averages = {},
    summary,
    admin_classes = [],
}: LegerProps) {
    const { user_role, is_wakasek_kurikulum } = usePage<SharedData>().props;
    const canSwitchClasses = user_role === 'admin' || user_role === 'wakasek_kurikulum' || Boolean(is_wakasek_kurikulum);
    const backHref = user_role === 'wakasek_kurikulum' ? '/dashboard' : '/gradebook';
    const backLabel = user_role === 'wakasek_kurikulum' ? 'Dashboard' : 'Nilai & Rapor';
    const [search, setSearch] = useState('');
    const [onlyAttention, setOnlyAttention] = useState(false);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter((row) => {
            const matchSearch =
                q === '' ||
                row.name.toLowerCase().includes(q) ||
                row.nis.toLowerCase().includes(q);
            const matchAttention = !onlyAttention || row.below_kktp_count > 0;
            return matchSearch && matchAttention;
        });
    }, [rows, search, onlyAttention]);

    const exportUrl = school_class
        ? `/gradebook/leger/export-csv?class_id=${school_class.id}`
        : '/gradebook/leger/export-csv';

    const handleAdminClassChange = (classId: string) => {
        router.visit(`/gradebook/leger?class_id=${classId}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Leger Nilai ${school_class ? school_class.name : ''} – LMS Mokopani`} />

            <div className="space-y-4 sm:space-y-5 fade-in pb-24 sm:pb-8 max-w-7xl mx-auto w-full min-w-0">
                {/* 1. Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1 border-b border-border/40 pb-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Link
                                href={backHref}
                                className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-primary transition"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                <span>{backLabel}</span>
                            </Link>
                            {period && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-muted text-muted-foreground text-[11px] font-bold border border-border/60">
                                    <GraduationCap className="h-3.5 w-3.5 text-primary" />
                                    <span>{period}</span>
                                </span>
                            )}
                            {(user_role === 'wakasek_kurikulum' || is_wakasek_kurikulum) && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary text-[11px] font-bold border border-primary/20">
                                    <span>Mode Baca (Wakasek Kurikulum)</span>
                                </span>
                            )}
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                            <Table2 className="h-6 w-6 text-primary shrink-0" />
                            <span>Leger Nilai {school_class ? `— ${school_class.name}` : ''}</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                            {homeroom_teacher
                                ? `Wali Kelas: ${homeroom_teacher.name}`
                                : 'Rekapitulasi nilai seluruh mata pelajaran siswa per kelas.'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {canSwitchClasses && admin_classes.length > 0 && (
                            <select
                                aria-label="Pilih kelas"
                                value={school_class?.id ?? ''}
                                onChange={(e) => handleAdminClassChange(e.target.value)}
                                className="h-10 rounded-xl border border-border/80 bg-card px-3 text-xs font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            >
                                {admin_classes.map((cls) => (
                                    <option key={cls.id} value={cls.id}>
                                        {cls.name}
                                    </option>
                                ))}
                            </select>
                        )}
                        {school_class && (
                            <a
                                href={exportUrl}
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition min-h-[40px]"
                            >
                                <Download className="h-4 w-4" />
                                <span>Unduh CSV</span>
                            </a>
                        )}
                    </div>
                </div>

                {/* 2. Summary KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-primary" />
                            <span>Total Siswa</span>
                        </p>
                        <p className="text-2xl font-black text-foreground mt-1">{summary.total_students}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
                            <span>Mata Pelajaran</span>
                        </p>
                        <p className="text-2xl font-black text-foreground mt-1">{summary.total_subjects}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                            <span>Rata-Rata Kelas</span>
                        </p>
                        <p className="text-2xl font-black text-foreground mt-1">
                            {summary.class_average > 0 ? summary.class_average : '-'}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            <span>Perlu Perhatian</span>
                        </p>
                        <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                            {summary.students_need_attention}
                        </p>
                    </div>
                </div>

                {/* 3. Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            aria-label="Cari nama atau NIS siswa"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari nama atau NIS siswa..."
                            className="w-full h-10 rounded-xl border border-border/80 bg-card pl-9 pr-9 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground shadow-2xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                        />
                        {search && (
                            <button
                                type="button"
                                aria-label="Hapus pencarian"
                                onClick={() => setSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => setOnlyAttention((prev) => !prev)}
                        className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer min-h-[40px] ${
                            onlyAttention
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                : 'bg-card text-muted-foreground border-border/80 hover:text-foreground'
                        }`}
                    >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Hanya yang Belum Tuntas ({summary.students_need_attention})</span>
                    </button>
                </div>

                {/* 4. Leger Matrix Table */}
                {!school_class || rows.length === 0 ? (
                    <div className="rounded-2xl border border-border/70 bg-card p-10 text-center space-y-2">
                        <Users className="h-10 w-10 mx-auto text-muted-foreground/40" />
                        <p className="text-sm font-bold text-foreground">Belum ada data siswa di kelas ini</p>
                        <p className="text-xs text-muted-foreground">
                            Pastikan siswa telah terdaftar pada kelas perwalian Anda.
                        </p>
                    </div>
                ) : filteredRows.length === 0 ? (
                    <div className="rounded-2xl border border-border/70 bg-card p-10 text-center space-y-2">
                        <Search className="h-10 w-10 mx-auto text-muted-foreground/40" />
                        <p className="text-sm font-bold text-foreground">Tidak ada siswa yang sesuai dengan filter</p>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-border/70 bg-muted/50 text-left">
                                        <th className="sticky left-0 z-10 bg-muted/95 backdrop-blur-xs px-3 py-3 font-bold text-muted-foreground w-10 text-center border-r border-border/40">
                                            No
                                        </th>
                                        <th className="sticky left-10 z-10 bg-muted/95 backdrop-blur-xs px-3 py-3 font-bold text-foreground min-w-[180px] border-r border-border/60">
                                            Siswa
                                        </th>
                                        {subjects.map((sub) => (
                                            <th
                                                key={sub.id}
                                                className="px-3 py-3 font-bold text-foreground text-center min-w-[100px] border-r border-border/30"
                                                title={`${sub.name} (KKTP: ${sub.kktp})`}
                                            >
                                                <div className="leading-tight line-clamp-2">{sub.name}</div>
                                                <div className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                                                    KKTP {sub.kktp}
                                                </div>
                                            </th>
                                        ))}
                                        <th className="px-3 py-3 font-bold text-foreground text-center min-w-[84px] bg-primary/5 border-r border-border/30">
                                            Rata-Rata
                                        </th>
                                        <th className="px-3 py-3 font-bold text-foreground text-center min-w-[76px] bg-primary/5">
                                            Tuntas
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {filteredRows.map((row, idx) => (
                                        <tr key={row.id} className="hover:bg-muted/25 transition-colors">
                                            <td className="sticky left-0 z-10 bg-card px-3 py-2.5 text-center font-semibold text-muted-foreground border-r border-border/40">
                                                {idx + 1}
                                            </td>
                                            <td className="sticky left-10 z-10 bg-card px-3 py-2.5 border-r border-border/60">
                                                <div className="font-bold text-foreground leading-tight">{row.name}</div>
                                                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{row.nis}</div>
                                            </td>
                                            {subjects.map((sub) => {
                                                const cell = row.scores[sub.id];
                                                if (!cell || !cell.has_summative_data) {
                                                    return (
                                                        <td
                                                            key={sub.id}
                                                            className="px-3 py-2.5 text-center text-muted-foreground/60 border-r border-border/30"
                                                        >
                                                            -
                                                        </td>
                                                    );
                                                }
                                                const scoreColor = cell.passed
                                                    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10'
                                                    : 'text-rose-700 dark:text-rose-400 bg-rose-500/10';
                                                const tooltip = `Sumatif TP: ${cell.tp_average ?? '-'} | SAS: ${cell.sas_score ?? '-'}`;

                                                return (
                                                    <td
                                                        key={sub.id}
                                                        title={tooltip}
                                                        className="px-2 py-2 text-center border-r border-border/30"
                                                    >
                                                        <span className={`inline-flex items-center justify-center min-w-[36px] px-2 py-1 rounded-lg font-black ${scoreColor}`}>
                                                            {cell.final_score}
                                                        </span>
                                                    </td>
                                                );
                                            })}
                                            <td className="px-3 py-2.5 text-center font-black text-foreground bg-primary/5 border-r border-border/30">
                                                {row.assessed_count > 0 ? row.overall_average : '-'}
                                            </td>
                                            <td className="px-3 py-2.5 text-center font-bold bg-primary/5">
                                                {row.assessed_count > 0 ? (
                                                    <span className={row.below_kktp_count > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                                                        {row.passed_count}/{row.assessed_count}
                                                    </span>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                {subjects.length > 0 && (
                                    <tfoot>
                                        <tr className="border-t-2 border-border bg-muted/50 font-bold">
                                            <td className="sticky left-0 z-10 bg-muted/95 px-3 py-3 border-r border-border/40" />
                                            <td className="sticky left-10 z-10 bg-muted/95 px-3 py-3 text-foreground border-r border-border/60">
                                                Rata-Rata Kelas
                                            </td>
                                            {subjects.map((sub) => {
                                                const avg = subject_averages[sub.id];
                                                return (
                                                    <td key={sub.id} className="px-3 py-3 text-center font-black text-foreground border-r border-border/30">
                                                        {avg !== null && avg !== undefined ? avg : '-'}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-3 py-3 text-center font-black text-primary bg-primary/10 border-r border-border/30">
                                                {summary.class_average > 0 ? summary.class_average : '-'}
                                            </td>
                                            <td className="px-3 py-3 bg-primary/10" />
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
