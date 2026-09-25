import React, { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { 
    FileSpreadsheet, 
    ChevronRight, 
    BookOpen, 
    Users,
    TrendingUp,
    Award,
    SlidersHorizontal,
    Search,
    GraduationCap,
    CheckCircle2
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Nilai & Rapor', href: '/gradebook' },
];

interface Teaching {
    id: number;
    subject_id: number;
    subject_name: string;
    class_id: number;
    class_name: string;
    student_count?: number;
}

interface ClassOption {
    id: number;
    name: string;
}

interface GradebookIndexProps {
    teachings: Teaching[];
    classes?: ClassOption[];
    selected_class_id?: number | null;
    period?: string;
}

export default function GradebookIndex({ 
    teachings = [], 
    classes = [], 
    selected_class_id = null,
    period = ''
}: GradebookIndexProps) {
    const [selectedClass, setSelectedClass] = useState<number | 'all'>(selected_class_id || 'all');
    const [search, setSearch] = useState('');

    // Filter teachings by selected class pill and search keyword
    const filteredTeachings = useMemo(() => {
        return teachings.filter(t => {
            const matchesClass = selectedClass === 'all' || t.class_id === selectedClass;
            const matchesSearch = 
                t.subject_name.toLowerCase().includes(search.toLowerCase()) ||
                t.class_name.toLowerCase().includes(search.toLowerCase());
            return matchesClass && matchesSearch;
        }).sort((a, b) => {
            const classCompare = a.class_name.localeCompare(b.class_name, undefined, { numeric: true, sensitivity: 'base' });
            if (classCompare !== 0) return classCompare;
            return a.subject_name.localeCompare(b.subject_name, undefined, { numeric: true, sensitivity: 'base' });
        });
    }, [teachings, selectedClass, search]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nilai & Rapor Siswa – LMS Mokopani" />

            <div className="space-y-4 sm:space-y-5 fade-in pb-24 sm:pb-8 max-w-7xl mx-auto w-full min-w-0">
                {/* 1. Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1 border-b border-border/40 pb-4">
                    <div className="space-y-0.5">
                        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                            <Award className="h-6 w-6 text-primary shrink-0" />
                            <span>Nilai & Rapor Siswa</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                            Kelola nilai harian asesmen per TP dan cetak Rapor Akhir siswa
                        </p>
                    </div>
                    {period && (
                        <div className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-1.5 rounded-xl bg-muted/60 border border-border/60 text-xs font-bold text-muted-foreground">
                            <GraduationCap className="h-3.5 w-3.5 text-primary" />
                            <span>{period}</span>
                        </div>
                    )}
                </div>

                {/* 2. Filter & Search Controls */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                    {/* Class Filter Pills */}
                    {classes.length > 0 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
                            <button
                                type="button"
                                onClick={() => setSelectedClass('all')}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer min-h-[38px] ${
                                    selectedClass === 'all'
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40'
                                }`}
                            >
                                Semua Kelas ({teachings.length})
                            </button>
                            {classes.map(c => {
                                const isSelected = selectedClass === c.id;
                                const count = teachings.filter(t => t.class_id === c.id).length;
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => setSelectedClass(c.id)}
                                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer min-h-[38px] ${
                                            isSelected
                                                ? 'bg-primary text-primary-foreground shadow-xs'
                                                : 'bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40'
                                        }`}
                                    >
                                        {c.name} ({count})
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Search Input */}
                    <div className="relative w-full sm:w-64 shrink-0">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Cari mata pelajaran atau kelas..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full h-10 rounded-xl border border-border/80 bg-card pl-9 pr-3.5 text-xs text-foreground placeholder:text-muted-foreground shadow-2xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                        />
                    </div>
                </div>

                {/* 3. Class Cards Grid */}
                <div className="grid gap-3.5 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredTeachings.length === 0 ? (
                        <div className="col-span-full py-16 text-center text-muted-foreground border border-dashed border-border/80 rounded-2xl bg-card/40 p-6 space-y-2">
                            <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground/30 mb-1" />
                            <h3 className="text-sm font-bold text-foreground">
                                {teachings.length === 0 ? 'Belum Ada Penempatan Mengajar Aktif' : 'Tidak Ada Kelas yang Sesuai'}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                {teachings.length === 0 
                                    ? 'Hubungi kurikulum atau admin untuk penugasan mengajar.' 
                                    : 'Coba ubah kata kunci pencarian atau pilih filter Semua Kelas.'}
                            </p>
                        </div>
                    ) : (
                        filteredTeachings.map((t) => {
                            const badgeLabel = t.class_name.toLowerCase().startsWith('kelas') 
                                ? t.class_name 
                                : `Kelas ${t.class_name}`;

                            return (
                                <div
                                    key={t.id}
                                    className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-primary/50 transition-all duration-200 overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-primary via-indigo-500 to-purple-500" />

                                    <div className="space-y-2.5 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[11px] font-extrabold text-primary bg-primary/10 px-2.5 py-1 rounded-lg shrink-0">
                                                {badgeLabel}
                                            </span>
                                            {typeof t.student_count === 'number' && (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                                                    <Users className="h-3 w-3 text-muted-foreground/70" />
                                                    <span>{t.student_count} Siswa</span>
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-1 pt-0.5" title={t.subject_name}>
                                            {t.subject_name}
                                        </h3>
                                    </div>

                                    {/* Dual Action Buttons: Buku Nilai (harian) & Rapor Akhir */}
                                    <div className="mt-4 pt-3.5 border-t border-border/60 grid grid-cols-2 gap-2">
                                        <Link
                                            href={route('gradebook.show', { class_id: t.class_id, subject_id: t.subject_id })}
                                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-muted/30 px-3 py-2 text-xs font-bold text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition active:scale-95 min-h-[38px]"
                                            title="Kelola Nilai Harian Asesmen TP"
                                        >
                                            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                                            <span>Buku Nilai</span>
                                        </Link>

                                        <Link
                                            href={route('gradebook.final-report', { class_id: t.class_id, subject_id: t.subject_id })}
                                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3 py-2 text-xs font-bold shadow-2xs hover:bg-primary/90 transition active:scale-95 min-h-[38px]"
                                            title="Lihat Rekap Nilai Akhir & Cetak e-Rapor"
                                        >
                                            <Award className="h-3.5 w-3.5" />
                                            <span>Rapor Akhir</span>
                                            <ChevronRight className="h-3 w-3 ml-[-2px]" />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
