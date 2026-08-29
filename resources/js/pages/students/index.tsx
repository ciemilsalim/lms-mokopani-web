import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { GraduationCap, Search } from 'lucide-react';
import { useState, useMemo } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Siswa', href: '/students' },
];

interface Student {
    id: number;
    name: string;
    nis: string;
    class_name: string | null;
    photo: string | null;
    has_account: boolean;
}

interface StudentsProps {
    students: Student[];
}

const getInitials = (name: string) => {
    return name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase();
};

const avatarColors = [
    'from-blue-500 to-blue-700',
    'from-violet-500 to-violet-700',
    'from-emerald-500 to-emerald-700',
    'from-rose-500 to-rose-700',
    'from-amber-500 to-amber-700',
    'from-cyan-500 to-cyan-700',
];

export default function Students({ students }: StudentsProps) {
    const [search, setSearch] = useState('');
    const [filterClass, setFilterClass] = useState('all');

    const classes = useMemo(() => {
        const uniqueClasses = new Set((students ?? []).map(s => s.class_name).filter(Boolean));
        return Array.from(uniqueClasses).sort();
    }, [students]);

    const filtered = (students ?? []).filter((s) => {
        const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                              s.nis.toLowerCase().includes(search.toLowerCase()) ||
                              (s.class_name ?? '').toLowerCase().includes(search.toLowerCase());
                              
        const matchesClass = filterClass === 'all' || s.class_name === filterClass;
        
        return matchesSearch && matchesClass;
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Siswa – LMS Mokopani" />

            <div className="space-y-4 sm:space-y-5 fade-in pb-24 sm:pb-8 max-w-7xl mx-auto w-full min-w-0">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Data Siswa</h1>
                        <p className="text-sm text-muted-foreground">
                            {(students ?? []).length} siswa terdaftar
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative w-full sm:max-w-sm">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            id="input-search-student"
                            type="text"
                            placeholder="Cari nama, NIS, atau kelas..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-slate-900 dark:text-slate-200"
                        />
                    </div>
                    <select
                        value={filterClass}
                        onChange={(e) => setFilterClass(e.target.value)}
                        className="w-full sm:w-auto rounded-lg border border-border bg-white py-2 px-3 text-sm text-foreground shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-slate-900 dark:text-slate-200"
                    >
                        <option value="all">Semua Kelas</option>
                        {classes.map(c => (
                            <option key={c as string} value={c as string}>{c as string}</option>
                        ))}
                    </select>
                </div>

                {/* Table */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <GraduationCap className="h-14 w-14 mb-4 opacity-25" />
                        <p className="text-sm font-medium">Tidak ada siswa ditemukan</p>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-muted">
                                <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Siswa</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">NIS</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kelas</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Akun LMS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filtered.map((student, idx) => (
                                    <tr key={student.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-3">
                                                {student.photo ? (
                                                    <img
                                                        src={student.photo}
                                                        alt={student.name}
                                                        className="h-9 w-9 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${avatarColors[idx % avatarColors.length]} text-white text-xs font-bold flex-shrink-0`}>
                                                        {getInitials(student.name)}
                                                    </div>
                                                )}
                                                <span className="font-medium text-sm text-foreground">{student.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-sm text-muted-foreground font-mono">{student.nis}</td>
                                        <td className="px-6 py-3 text-sm text-muted-foreground">{student.class_name ?? '-'}</td>
                                        <td className="px-6 py-3">
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${student.has_account ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                                                {student.has_account ? '✓ Aktif' : '✕ Belum ada'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
