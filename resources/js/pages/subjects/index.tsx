import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router } from '@inertiajs/react';
import { BookOpen, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { usePage } from '@inertiajs/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Mata Pelajaran', href: '/subjects' },
];

interface Subject {
    id: number;
    name: string;
    code: string;
    description: string | null;
    materials_count: number;
    assignments_count: number;
    teacher?: {
        name: string;
        photo: string | null;
    } | null;
}

interface SubjectsProps {
    subjects: Subject[];
}

export default function Subjects({ subjects }: SubjectsProps) {
    const [search, setSearch] = useState('');
    const { user_role } = usePage<SharedData>().props;
    const isStudent = user_role === 'student';

    const filtered = (subjects ?? []).filter(
        (s) =>
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.code.toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isStudent ? 'Pelajaran Saya – LMS Mokopani' : 'Mata Pelajaran – LMS Mokopani'} />

            <div className="space-y-4 sm:space-y-5 fade-in pb-24 sm:pb-8 max-w-7xl mx-auto w-full min-w-0">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            {isStudent ? 'Pelajaran Saya' : 'Mata Pelajaran'}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {isStudent ? 'Akses semua materi dan asesmen pembelajaranmu' : 'Lihat semua mata pelajaran (dikelola melalui SIPADA)'}
                        </p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        id="input-search-subject"
                        type="text"
                        placeholder="Cari mata pelajaran..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-slate-900 dark:text-slate-200"
                    />
                </div>

                {/* Table */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <BookOpen className="h-14 w-14 mb-4 opacity-25" />
                        <p className="text-sm font-medium">Tidak ada mata pelajaran ditemukan</p>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mata Pelajaran</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kode</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deskripsi</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Materi & Tugas</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pengampu</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filtered.map((subject) => (
                                    <tr 
                                        key={subject.id} 
                                        onClick={() => router.visit(`/subjects/${subject.id}`)}
                                        className="hover:bg-muted/50 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground flex-shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                    <BookOpen className="h-4 w-4" />
                                                </div>
                                                <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">{subject.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-sm text-muted-foreground font-mono">
                                            {subject.code && subject.code.toLowerCase() !== subject.name.toLowerCase() ? subject.code : '-'}
                                        </td>
                                        <td className="px-6 py-3 text-sm text-muted-foreground">
                                            <span className="line-clamp-1 max-w-[200px]">
                                                {subject.description && subject.description.toLowerCase() !== subject.name.toLowerCase() && subject.description.toLowerCase() !== subject.code?.toLowerCase() 
                                                    ? subject.description 
                                                    : '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                                    {subject.materials_count} Materi
                                                </span>
                                                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                                                    {subject.assignments_count} Tugas
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            {subject.teacher ? (
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-7 w-7">
                                                        <AvatarImage src={subject.teacher.photo ?? ''} alt={subject.teacher.name} />
                                                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-sky-500 text-[9px] font-bold text-white uppercase">
                                                            {subject.teacher.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-xs font-medium text-muted-foreground line-clamp-1 max-w-[120px]">
                                                        {subject.teacher.name}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">-</span>
                                            )}
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
