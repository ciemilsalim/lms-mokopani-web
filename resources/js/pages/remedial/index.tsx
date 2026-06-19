import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Plus, FileWarning, Users, BookOpen, ChevronRight, Activity, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
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

export default function RemedialIndex({ records, teachings, filters }: RemedialIndexProps) {
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
        const all = records.total;
        const assigned = records.data.filter(r => r.status === 'assigned').length;
        const inProgress = records.data.filter(r => r.status === 'in_progress').length;
        const completed = records.data.filter(r => r.status === 'completed').length;
        return { all, assigned, inProgress, completed };
    }, [records]);

    const statusBadge = (status: string) => {
        const map: Record<string, { bg: string; icon: React.ReactNode }> = {
            assigned: { bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: <Clock className="h-3 w-3" /> },
            in_progress: { bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <Activity className="h-3 w-3" /> },
            completed: { bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: <CheckCircle2 className="h-3 w-3" /> },
            expired: { bg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <AlertTriangle className="h-3 w-3" /> },
        };
        const label: Record<string, string> = {
            assigned: 'Ditugaskan',
            in_progress: 'Dalam Proses',
            completed: 'Selesai',
            expired: 'Kadaluarsa',
        };
        const style = map[status];
        return (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${style?.bg || ''}`}>
                {style?.icon}
                {label[status] || status}
            </span>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Remedial & Pengayaan – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-6 min-w-0 fade-in">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Remedial & Pengayaan</h1>
                        <p className="text-sm text-muted-foreground">Kelola program remedial dan pengayaan untuk siswa</p>
                    </div>
                    <Link
                        href={route('remedial.create')}
                        className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-primary-hover hover:shadow-xl active:scale-[0.97]"
                    >
                        <Plus className="h-4 w-4" />
                        Buat Baru
                    </Link>
                </div>

                {/* Stat Summary Cards */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <div className="card-hover flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <FileWarning className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stats.all}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Record</p>
                        </div>
                    </div>
                    <div className="card-hover flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                            <Clock className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stats.assigned}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ditugaskan</p>
                        </div>
                    </div>
                    <div className="card-hover flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                            <Activity className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stats.inProgress}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dalam Proses</p>
                        </div>
                    </div>
                    <div className="card-hover flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Selesai</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <select
                        value={searchSubject}
                        onChange={(e) => {
                            const val = e.target.value;
                            setSearchSubject(val);
                            setSearchClass('');
                            handleFilterChange('subject_id', val);
                        }}
                        className="rounded-xl border border-border bg-white px-4 py-2 text-sm outline-none focus:border-primary dark:bg-slate-900"
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
                        className="rounded-xl border border-border bg-white px-4 py-2 text-sm outline-none focus:border-primary dark:bg-slate-900"
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
                        className="rounded-xl border border-border bg-white px-4 py-2 text-sm outline-none focus:border-primary dark:bg-slate-900"
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
                        className="rounded-xl border border-border bg-white px-4 py-2 text-sm outline-none focus:border-primary dark:bg-slate-900"
                    >
                        <option value="">Semua Status</option>
                        <option value="assigned">Ditugaskan</option>
                        <option value="in_progress">Dalam Proses</option>
                        <option value="completed">Selesai</option>
                        <option value="expired">Kadaluarsa</option>
                    </select>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    <div className="overflow-x-auto scrollbar-thin">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-border bg-slate-50/80 dark:bg-slate-900/50">
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Siswa</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Tugas</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Tipe</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Nilai Awal</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                                        {searchType === 'remedial' ? 'Nilai Remedial' : searchType === 'pengayaan' ? 'Nilai Pengayaan' : 'N. Rem / Peng'}
                                    </th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Tenggat</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {records.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-20 text-center">
                                            <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
                                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                                                    <FileWarning className="h-7 w-7 text-muted-foreground/40" />
                                                </div>
                                                <p className="text-sm font-medium text-muted-foreground">Belum ada records remedial / pengayaan.</p>
                                                <p className="text-xs text-muted-foreground/60">Gunakan tombol "Buat Baru" di atas untuk menambahkan.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    records.data.map((r, idx) => (
                                        <tr key={r.id} className={`group transition-colors hover:bg-primary/[0.03] dark:hover:bg-primary/[0.06] ${idx % 2 === 1 ? 'bg-slate-50/40 dark:bg-slate-900/20' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-muted/50 dark:text-foreground/80">
                                                        <Users className="h-3.5 w-3.5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-foreground">{r.student.name}</p>
                                                        <p className="text-[10px] font-mono text-muted-foreground">{r.student.nis}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground/60" />
                                                    <span className="text-sm text-foreground line-clamp-1 max-w-[200px]">{r.assignment.title}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                                    r.type === 'remedial'
                                                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                }`}>
                                                    {r.type === 'remedial' ? '🔁 Remedial' : '🚀 Pengayaan'}
                                                </span>
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
                                            <td className="px-6 py-4 text-sm tabular-nums text-muted-foreground">{r.due_date ? new Date(r.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : <span className="text-muted-foreground/30">—</span>}</td>
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    href={route('remedial.edit', r.id)}
                                                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-primary opacity-0 transition-all group-hover:opacity-100 hover:bg-primary/10"
                                                >
                                                    Detail <ChevronRight className="h-3 w-3" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {records.last_page > 1 && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Menampilkan {records.from}-{records.to} dari {records.total}</span>
                        <div className="flex gap-2">
                            {Array.from({ length: records.last_page }, (_, i) => i + 1).map((page) => (
                                <Link
                                    key={page}
                                    href={route('remedial.index', { ...filters, page })}
                                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold transition ${
                                        page === records.current_page
                                            ? 'bg-primary text-white'
                                            : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
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
