import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Search, Users } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Guru', href: '/teachers' },
];

interface Teacher {
    id: number;
    name: string;
    nip: string | null;
    subjects: string;
    photo: string | null;
    has_account: boolean;
}

interface TeachersProps {
    teachers: Teacher[];
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
    'from-indigo-500 to-indigo-700',
    'from-fuchsia-500 to-fuchsia-700',
    'from-teal-500 to-teal-700',
    'from-orange-500 to-orange-700',
    'from-pink-500 to-pink-700',
    'from-sky-500 to-sky-700',
];

export default function Teachers({ teachers }: TeachersProps) {
    const [search, setSearch] = useState('');
    const [filterAccount, setFilterAccount] = useState('all');

    const filtered = (teachers ?? []).filter((t) => {
        const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
                              (t.nip ?? '').toLowerCase().includes(search.toLowerCase()) ||
                              t.subjects.toLowerCase().includes(search.toLowerCase());
                              
        let matchesAccount = true;
        if (filterAccount === 'active') matchesAccount = t.has_account === true;
        if (filterAccount === 'inactive') matchesAccount = t.has_account === false;
        
        return matchesSearch && matchesAccount;
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Guru – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Data Guru</h1>
                        <p className="text-sm text-muted-foreground">
                            {(teachers ?? []).length} guru terdaftar
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative w-full sm:max-w-sm">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            id="input-search-teacher"
                            type="text"
                            placeholder="Cari nama, NIP, atau mata pelajaran..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-slate-900 dark:text-slate-200"
                        />
                    </div>
                    <select
                        value={filterAccount}
                        onChange={(e) => setFilterAccount(e.target.value)}
                        className="w-full sm:w-auto rounded-lg border border-border bg-white py-2 px-3 text-sm text-foreground shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-slate-900 dark:text-slate-200"
                    >
                        <option value="all">Semua Status Akun</option>
                        <option value="active">Aktif (Punya Akun)</option>
                        <option value="inactive">Belum Ada Akun</option>
                    </select>
                </div>

                {/* Table */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <Users className="h-14 w-14 mb-4 opacity-25" />
                        <p className="text-sm font-medium">Tidak ada guru ditemukan</p>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Guru</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">NIP</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mata Pelajaran</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Akun LMS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filtered.map((teacher, idx) => (
                                    <tr key={teacher.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-3">
                                                {teacher.photo ? (
                                                    <img
                                                        src={`/storage/${teacher.photo}`}
                                                        alt={teacher.name}
                                                        className="h-9 w-9 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${avatarColors[idx % avatarColors.length]} text-white text-xs font-bold flex-shrink-0`}>
                                                        {getInitials(teacher.name)}
                                                    </div>
                                                )}
                                                <span className="font-medium text-sm text-foreground">{teacher.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-sm text-muted-foreground font-mono">{teacher.nip ?? '-'}</td>
                                        <td className="px-6 py-3 text-sm text-muted-foreground">
                                            <span className="line-clamp-2">{teacher.subjects || '-'}</span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${teacher.has_account ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                                                {teacher.has_account ? '✓ Aktif' : '✕ Belum ada'}
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
