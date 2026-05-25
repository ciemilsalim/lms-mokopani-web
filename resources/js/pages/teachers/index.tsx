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

    const filtered = (teachers ?? []).filter(
        (t) =>
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            (t.nip ?? '').toLowerCase().includes(search.toLowerCase()) ||
            t.subjects.toLowerCase().includes(search.toLowerCase()),
    );

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

                {/* Search */}
                <div className="relative max-w-sm">
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

                {/* Grid */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <Users className="h-14 w-14 mb-4 opacity-25" />
                        <p className="text-sm font-medium">Tidak ada guru ditemukan</p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filtered.map((teacher, idx) => (
                            <div
                                key={teacher.id}
                                className="group rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-primary/30 dark:hover:border-primary/70 transition-all"
                            >
                                <div className="mb-4 flex justify-between items-start">
                                    {teacher.photo ? (
                                        <img
                                            src={`/storage/${teacher.photo}`}
                                            alt={teacher.name}
                                            className="h-14 w-14 rounded-full object-cover shadow-sm"
                                        />
                                    ) : (
                                        <div className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${avatarColors[idx % avatarColors.length]} text-white text-lg font-bold shadow-sm`}>
                                            {getInitials(teacher.name)}
                                        </div>
                                    )}
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${teacher.has_account ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                                        {teacher.has_account ? 'Active' : 'No Account'}
                                    </span>
                                </div>
                                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                    {teacher.name}
                                </h3>
                                <p className="text-xs text-muted-foreground font-mono mt-1">{teacher.nip ?? 'NIP Tidak Tersedia'}</p>
                                <div className="mt-3">
                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Mata Pelajaran</p>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {teacher.subjects || '-'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
