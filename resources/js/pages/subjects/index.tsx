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

            <div className="flex h-full flex-1 flex-col gap-6 min-w-0 fade-in">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            {isStudent ? 'Pelajaran Saya' : 'Mata Pelajaran'}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {isStudent ? 'Akses semua materi dan asesmen pembelajaranmu' : 'Kelola semua mata pelajaran yang tersedia'}
                        </p>
                    </div>
                    {!isStudent && (
                        <button
                            id="btn-add-subject"
                            onClick={() => router.visit('/subjects/create')}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/70 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 dark:shadow-lg dark:shadow-black/20 hover:opacity-90 transition active:scale-95 cursor-pointer"
                        >
                            <Plus className="h-4 w-4" />
                            Tambah Mata Pelajaran
                        </button>
                    )}
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

                {/* Grid */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <BookOpen className="h-14 w-14 mb-4 opacity-25" />
                        <p className="text-sm font-medium">Tidak ada mata pelajaran ditemukan</p>
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filtered.map((subject) => (
                            <div
                                key={subject.id}
                                onClick={() => router.visit(`/subjects/${subject.id}`)}
                                className="group cursor-pointer rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-primary/30 dark:hover:border-primary/70 transition-shadow"
                            >
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground shadow-sm">
                                    <BookOpen className="h-6 w-6 text-muted-foreground" />
                                </div>
                                {subject.code && subject.code.toLowerCase() !== subject.name.toLowerCase() && (
                                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">{subject.code}</p>
                                )}
                                <h3 className="mt-1 font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                    {subject.name}
                                </h3>
                                {subject.description && subject.description.toLowerCase() !== subject.name.toLowerCase() && subject.description.toLowerCase() !== subject.code?.toLowerCase() && (
                                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{subject.description}</p>
                                )}

                                {subject.teacher && (
                                    <div className="mt-4 flex items-center gap-3 rounded-xl bg-muted/50 p-2.5 border border-border/50 group/teacher transition-colors hover:bg-muted">
                                        <Avatar className="h-9 w-9 border-2 border-white dark:border-slate-700 shadow-sm">
                                            <AvatarImage src={subject.teacher.photo ?? ''} alt={subject.teacher.name} />
                                            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-sky-500 text-[10px] font-bold text-white uppercase">
                                                {subject.teacher.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Guru Pengampu</span>
                                            <span className="text-xs font-bold text-foreground line-clamp-1 group-hover/teacher:text-primary transition-colors">
                                                {subject.teacher.name}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
                                    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                                        📄 {subject.materials_count} Materi
                                    </span>
                                    <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                                        📝 {subject.assignments_count} Tugas
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
