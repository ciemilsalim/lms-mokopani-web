import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { 
    Plus, 
    FileWarning, 
    Users, 
    BookOpen, 
    ChevronRight, 
    Activity, 
    Clock, 
    CheckCircle2, 
    AlertTriangle,
    Layers,
    Calendar,
    ArrowRight
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Remedial & Pengayaan', href: '/remedial' },
];

interface Teaching {
    subject_id: number;
    subject_name: string;
    class_id: number;
    class_name: string;
}

interface Student {
    id: number;
    name: string;
    nis: string;
    school_class?: { name: string } | null;
    schoolClass?: { name: string } | null;
}

interface Assignment {
    id: number;
    title: string;
}

interface RemedialRecord {
    id: number;
    type: 'remedial' | 'pengayaan';
    initial_score: number | null;
    remedial_score: number | null;
    description: string | null;
    due_date: string | null;
    status: string;
    created_at: string;
    student: Student;
    assignment: Assignment;
    subject: { id: number; name: string };
}

interface Pagination {
    data: RemedialRecord[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
}

interface RemedialIndexProps {
    records: Pagination;
    teachings: Teaching[];
    filters: { subject_id?: string; class_id?: string; status?: string; type?: string };
}

export default function RemedialIndex({ records, teachings = [], filters }: RemedialIndexProps) {
    const [searchType, setSearchType] = useState(filters.type || '');
    const [searchStatus, setSearchStatus] = useState(filters.status || '');
    const [searchSubject, setSearchSubject] = useState(filters.subject_id || '');
    const [searchClass, setSearchClass] = useState(filters.class_id || '');

    useEffect(() => {
        setSearchType(filters.type || '');
        setSearchStatus(filters.status || '');
        setSearchSubject(filters.subject_id || '');
        setSearchClass(filters.class_id || '');
    }, [filters]);

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = {
            type: key === 'type' ? value : searchType || undefined,
            status: key === 'status' ? value : searchStatus || undefined,
            subject_id: key === 'subject_id' ? value : searchSubject || undefined,
            class_id: key === 'class_id' ? value : searchClass || undefined,
        };

        if (key === 'subject_id') {
            newFilters.class_id = undefined;
            setSearchClass('');
        }

        router.get(route('remedial.index'), newFilters, { preserveState: true, preserveScroll: true });
    };

    // Filter unique subjects
    const uniqueSubjects = Array.from(
        new Map(teachings.map((t) => [t.subject_id, t.subject_name])).entries()
    ).map(([id, name]) => ({ id, name }));

    // Filter classes based on selected subject
    const filteredClasses = teachings
        .filter((t) => !searchSubject || t.subject_id === Number(searchSubject))
        .filter((value, index, self) =>
            self.findIndex((t) => t.class_id === value.class_id) === index
        )
        .map((t) => ({ id: t.class_id, name: t.class_name }));

    // Stat counters
    const stats = useMemo(() => {
        const all = records.total || 0;
        const assigned = records.data.filter(r => r.status === 'assigned').length;
        const inProgress = records.data.filter(r => r.status === 'in_progress').length;
        const completed = records.data.filter(r => r.status === 'completed').length;
        return { all, assigned, inProgress, completed };
    }, [records]);

    const statusBadge = (status: string) => {
        const map: Record<string, { bg: string; icon: React.ReactNode }> = {
            assigned: { bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-500/20', icon: <Clock className="h-3.5 w-3.5" /> },
            in_progress: { bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-500/20', icon: <Activity className="h-3.5 w-3.5" /> },
            completed: { bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-500/20', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
            expired: { bg: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-500/20', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
        };
        const label: Record<string, string> = {
            assigned: 'Ditugaskan',
            in_progress: 'Dalam Proses',
            completed: 'Selesai',
            expired: 'Kadaluarsa',
        };
        const style = map[status];
        return (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-tight h-[28px] shrink-0 ${style?.bg || 'bg-muted text-muted-foreground'}`}>
                {style?.icon}
                <span>{label[status] || status}</span>
            </span>
        );
    };

    const typeBadge = (type: 'remedial' | 'pengayaan') => {
        return (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold shrink-0 ${
                type === 'remedial'
                    ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
            }`}>
                <span>{type === 'remedial' ? '🔁 Remedial' : '🚀 Pengayaan'}</span>
            </span>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Remedial & Pengayaan – LMS Mokopani" />

            <div className="space-y-4 sm:space-y-5 fade-in pb-24 sm:pb-8 max-w-7xl mx-auto w-full min-w-0 px-1 sm:px-0">
                {/* 1. Header & Page Intro */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate">
                            Program Pembelajaran
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                            Remedial & Pengayaan siswa
                        </p>
                    </div>
                    
                    {/* CTA Button: 48px height, 100% on mobile */}
                    <Link
                        href={route('remedial.create')}
                        className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-white shadow-sm transition hover:bg-primary/90 hover:shadow active:scale-[0.98] shrink-0"
                    >
                        <Plus className="h-5 w-5" />
                        <span>Buat Program</span>
                    </Link>
                </div>

                {/* 2. Stat Summary Cards (2x2 on mobile, 4 cols on desktop) */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
                    {/* Stat 1: Total Record */}
                    <div className="flex min-h-[88px] sm:min-h-[96px] items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 sm:p-4 shadow-2xs">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Layers className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-none">
                                {stats.all}
                            </p>
                            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1 truncate">
                                Total Record
                            </p>
                        </div>
                    </div>

                    {/* Stat 2: Ditugaskan */}
                    <div className="flex min-h-[88px] sm:min-h-[96px] items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 sm:p-4 shadow-2xs">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <Clock className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-none">
                                {stats.assigned}
                            </p>
                            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1 truncate">
                                Ditugaskan
                            </p>
                        </div>
                    </div>

                    {/* Stat 3: Dalam Proses */}
                    <div className="flex min-h-[88px] sm:min-h-[96px] items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 sm:p-4 shadow-2xs">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Activity className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-none">
                                {stats.inProgress}
                            </p>
                            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1 truncate">
                                Dalam Proses
                            </p>
                        </div>
                    </div>

                    {/* Stat 4: Selesai */}
                    <div className="flex min-h-[88px] sm:min-h-[96px] items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 sm:p-4 shadow-2xs">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-none">
                                {stats.completed}
                            </p>
                            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1 truncate">
                                Selesai
                            </p>
                        </div>
                    </div>
                </div>

                {/* 3. Compact Filters (2x2 grid on mobile, flex row on desktop) */}
                <div className="grid grid-cols-2 lg:flex lg:flex-wrap gap-2">
                    <select
                        value={searchSubject}
                        onChange={(e) => {
                            const val = e.target.value;
                            setSearchSubject(val);
                            setSearchClass('');
                            handleFilterChange('subject_id', val);
                        }}
                        className="h-11 sm:h-12 w-full lg:w-auto rounded-xl border border-border/80 bg-card px-3 text-xs sm:text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                        <option value="">Semua Mapel</option>
                        {uniqueSubjects.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>

                    <select
                        value={searchClass}
                        onChange={(e) => {
                            const val = e.target.value;
                            setSearchClass(val);
                            handleFilterChange('class_id', val);
                        }}
                        className="h-11 sm:h-12 w-full lg:w-auto rounded-xl border border-border/80 bg-card px-3 text-xs sm:text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                        <option value="">Semua Kelas</option>
                        {filteredClasses.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>

                    <select
                        value={searchType}
                        onChange={(e) => {
                            const val = e.target.value;
                            setSearchType(val);
                            handleFilterChange('type', val);
                        }}
                        className="h-11 sm:h-12 w-full lg:w-auto rounded-xl border border-border/80 bg-card px-3 text-xs sm:text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                        <option value="">Semua Tipe</option>
                        <option value="remedial">Remedial</option>
                        <option value="pengayaan">Pengayaan</option>
                    </select>

                    <select
                        value={searchStatus}
                        onChange={(e) => {
                            const val = e.target.value;
                            setSearchStatus(val);
                            handleFilterChange('status', val);
                        }}
                        className="h-11 sm:h-12 w-full lg:w-auto rounded-xl border border-border/80 bg-card px-3 text-xs sm:text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                        <option value="">Semua Status</option>
                        <option value="assigned">Ditugaskan</option>
                        <option value="in_progress">Dalam Proses</option>
                        <option value="completed">Selesai</option>
                        <option value="expired">Kadaluarsa</option>
                    </select>
                </div>

                {/* 4. Section Title & List */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base sm:text-lg font-bold text-foreground">
                            Daftar Program
                        </h2>
                        {records.total > 0 && (
                            <span className="text-xs text-muted-foreground font-semibold">
                                Total: {records.total}
                            </span>
                        )}
                    </div>

                    {/* Empty State Presentation */}
                    {records.data.length === 0 ? (
                        <div className="py-8 px-4 text-center rounded-2xl border border-dashed border-border/80 bg-card/40 flex flex-col items-center justify-center space-y-2">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground/50">
                                <FileWarning className="h-6 w-6" />
                            </div>
                            <h3 className="text-sm font-bold text-foreground">Belum Ada Program</h3>
                            <p className="text-xs text-muted-foreground max-w-sm">
                                Belum ada siswa yang ditugaskan untuk remedial atau pengayaan.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* MOBILE DATA PRESENTATION: Cards (< 1024px) */}
                            <div className="lg:hidden space-y-2.5">
                                {records.data.map((r) => {
                                    const studentClass = r.student.schoolClass?.name || r.student.school_class?.name;
                                    const metaText = [r.subject?.name, studentClass].filter(Boolean).join(' · ');

                                    return (
                                        <div
                                            key={r.id}
                                            className="group relative flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4 shadow-2xs space-y-3 transition hover:border-primary/50 min-h-[110px]"
                                        >
                                            {/* Top Row: Name + Type Badge */}
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="font-bold text-sm text-foreground line-clamp-2 leading-snug">
                                                        {r.student.name}
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                                        {metaText || `NIS: ${r.student.nis}`}
                                                    </p>
                                                </div>
                                                {typeBadge(r.type)}
                                            </div>

                                            {/* Assignment details */}
                                            <div className="rounded-xl bg-muted/30 border border-border/50 p-2.5 space-y-2 text-xs">
                                                <div className="flex items-center gap-1.5 text-muted-foreground font-medium truncate">
                                                    <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                                                    <span className="truncate">{r.assignment.title}</span>
                                                </div>

                                                {/* Scores comparison + Status */}
                                                <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-border/40">
                                                    <div className="flex items-center gap-1 text-xs">
                                                        <span className="text-muted-foreground font-medium">Nilai:</span>
                                                        <span className="font-bold text-foreground tabular-nums">
                                                            {r.initial_score ?? '—'}
                                                        </span>
                                                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                                        <span className={`font-black tabular-nums ${
                                                            r.remedial_score !== null && r.remedial_score !== undefined
                                                                ? (r.remedial_score >= 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')
                                                                : 'text-muted-foreground/60'
                                                        }`}>
                                                            {r.remedial_score ?? 'Belum ada'}
                                                        </span>
                                                    </div>

                                                    {statusBadge(r.status)}
                                                </div>

                                                {r.due_date && (
                                                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                        <Calendar className="h-3 w-3" />
                                                        <span>Tenggat: {new Date(r.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Primary Action Button (min 44px) */}
                                            <Link
                                                href={route('remedial.edit', r.id)}
                                                className="w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/15 text-primary text-xs sm:text-sm font-bold transition active:scale-[0.98]"
                                            >
                                                <span>Lihat Detail</span>
                                                <ChevronRight className="h-4 w-4" />
                                            </Link>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* DESKTOP DATA PRESENTATION: Table (>= 1024px) */}
                            <div className="hidden lg:block overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xs">
                                <div className="overflow-x-auto scrollbar-thin">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-border bg-muted/40">
                                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Siswa</th>
                                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Tugas</th>
                                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Tipe</th>
                                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Nilai Awal</th>
                                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                                                    {searchType === 'remedial' ? 'Nilai Remedial' : searchType === 'pengayaan' ? 'Nilai Pengayaan' : 'N. Rem / Peng'}
                                                </th>
                                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Tenggat</th>
                                                <th className="px-6 py-4 text-right">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {records.data.map((r, idx) => (
                                                <tr key={r.id} className={`group transition-colors hover:bg-primary/[0.03] dark:hover:bg-primary/[0.06] ${idx % 2 === 1 ? 'bg-muted/10' : ''}`}>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                                <Users className="h-3.5 w-3.5" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-foreground">{r.student.name}</p>
                                                                <p className="text-[10px] font-mono text-muted-foreground">{r.student.nis}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <BookOpen className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                                                            <span className="text-sm text-foreground line-clamp-1 max-w-[220px]">{r.assignment.title}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {typeBadge(r.type)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="font-bold text-foreground tabular-nums">{r.initial_score ?? <span className="text-muted-foreground/30">—</span>}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`font-bold tabular-nums ${r.remedial_score !== null && r.remedial_score !== undefined ? (r.remedial_score >= 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400') : 'text-muted-foreground/30'}`}>
                                                            {r.remedial_score ?? '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">{statusBadge(r.status)}</td>
                                                    <td className="px-6 py-4 text-xs tabular-nums text-muted-foreground">{r.due_date ? new Date(r.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : <span className="text-muted-foreground/30">—</span>}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Link
                                                            href={route('remedial.edit', r.id)}
                                                            className="inline-flex min-h-[36px] items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 transition"
                                                        >
                                                            <span>Lihat Detail</span>
                                                            <ChevronRight className="h-3.5 w-3.5" />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* 5. Pagination */}
                {records.last_page > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-muted-foreground pt-2">
                        <span>Menampilkan {records.from}-{records.to} dari {records.total} record</span>
                        <div className="flex items-center gap-1.5">
                            {Array.from({ length: records.last_page }, (_, i) => i + 1).map((page) => (
                                <Link
                                    key={page}
                                    href={route('remedial.index', { ...filters, page })}
                                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition ${
                                        page === records.current_page
                                            ? 'bg-primary text-white shadow-xs'
                                            : 'bg-card border border-border/80 text-muted-foreground hover:bg-primary/10 hover:text-primary'
                                    }`}
                                >
                                    {page}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
