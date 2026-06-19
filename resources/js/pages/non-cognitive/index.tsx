import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Users, Search, ClipboardCheck, ChevronRight, AlertCircle } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Diagnostik Non-Kognitif', href: '/non-cognitive' },
];

interface StudentRow {
    id: number;
    name: string;
    nis: string;
    class_name: string;
    has_diagnostic: boolean;
    learning_style: string | null;
    updated_at: string | null;
}

interface NonCognitiveIndexProps {
    students: StudentRow[];
}

export default function NonCognitiveIndex({ students }: NonCognitiveIndexProps) {
    const [search, setSearch] = useState('');

    const filtered = students.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.nis.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Diagnostik Non-Kognitif – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-6 min-w-0">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Diagnostik Non-Kognitif</h1>
                        <p className="text-sm text-muted-foreground">Kelola data gaya belajar, motivasi, minat, dan latar belakang siswa</p>
                    </div>
                </div>

                <div className="relative flex-1 md:max-w-sm">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Cari nama atau NIS..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-2xl border border-border bg-white px-11 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:bg-slate-900"
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-muted-foreground">
                            <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Tidak ada siswa ditemukan.</p>
                        </div>
                    ) : (
                        filtered.map((s) => (
                            <Link
                                key={s.id}
                                href={route('non-cognitive.edit', s.id)}
                                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary hover:shadow-xl hover:shadow-primary/10"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                                            s.has_diagnostic
                                                ? 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-900/30 dark:text-emerald-400'
                                                : 'bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-white'
                                        }`}>
                                            {s.has_diagnostic ? <ClipboardCheck className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-foreground group-hover:text-primary transition-colors">{s.name}</p>
                                            <p className="text-[10px] text-muted-foreground">{s.nis} &middot; {s.class_name}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className={`font-bold uppercase tracking-wider ${
                                        s.has_diagnostic ? 'text-emerald-600' : 'text-muted-foreground'
                                    }`}>
                                        {s.has_diagnostic ? 'Terisi' : 'Belum Diisi'}
                                    </span>
                                    {s.has_diagnostic && (
                                        <span className="text-muted-foreground">
                                            {s.learning_style ?? '-'} &middot; {s.updated_at}
                                        </span>
                                    )}
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
