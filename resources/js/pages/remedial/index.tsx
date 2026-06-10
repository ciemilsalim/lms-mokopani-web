import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Plus, FileWarning, Users, BookOpen, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

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

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        };
        const label: Record<string, string> = {
            assigned: 'Ditugaskan',
            in_progress: 'Dalam Proses',
            completed: 'Selesai',
            expired: 'Kadaluarsa',
        };
        return (
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${map[status] || ''}`}>
                {label[status] || status}
            </span>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Remedial & Pengayaan – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Remedial & Pengayaan</h1>
                        <p className="text-sm text-muted-foreground">Kelola program remedial dan pengayaan untuk siswa</p>
                    </div>
                    <Link
                        href={route('remedial.create')}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
                    >
                        <Plus className="h-4 w-4" />
                        Buat Baru
                    </Link>
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

                <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl shadow-border/30 dark:shadow-none">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/50">
                                    <th className="px-6 py-4 font-bold text-foreground">Siswa</th>
                                    <th className="px-6 py-4 font-bold text-foreground">Tugas</th>
                                    <th className="px-6 py-4 font-bold text-foreground">Tipe</th>
                                    <th className="px-6 py-4 font-bold text-foreground">Nilai Awal</th>
                                    <th className="px-6 py-4 font-bold text-foreground">
                                        {searchType === 'remedial' ? 'Nilai Remedial' : searchType === 'pengayaan' ? 'Nilai Pengayaan' : 'Nilai Remedial / Pengayaan'}
                                    </th>
                                    <th className="px-6 py-4 font-bold text-foreground">Status</th>
                                    <th className="px-6 py-4 font-bold text-foreground">Tenggat</th>
                                    <th className="px-6 py-4 font-bold text-foreground"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {records.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-16 text-center text-muted-foreground">
                                            <FileWarning className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                            <p className="text-sm">Belum ada records remedial / pengayaan.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    records.data.map((r) => (
                                        <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <p className="font-bold text-foreground">{r.student.name}</p>
                                                        <p className="text-[10px] text-muted-foreground">{r.student.nis}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm text-foreground">{r.assignment.title}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                                    r.type === 'remedial'
                                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                }`}>
                                                    {r.type === 'remedial' ? 'Remedial' : 'Pengayaan'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-bold">{r.initial_score ?? '-'}</td>
                                            <td className="px-6 py-4 font-bold">{r.remedial_score ?? '-'}</td>
                                            <td className="px-6 py-4">{statusBadge(r.status)}</td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground">{r.due_date ? new Date(r.due_date).toLocaleDateString('id-ID') : '-'}</td>
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    href={route('remedial.edit', r.id)}
                                                    className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
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
