import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { BookOpen, Plus, Search, Printer, Edit2, Trash2, Calendar, FileText } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Pembelajaran', href: '/lesson-plans' },
];

interface ModulAjar {
    id: number;
    subject_name: string;
    class_name: string;
    tp_code: string;
    tp_desc: string;
    material_title: string;
    pedagogical_model: string;
    created_at: string;
}

interface IndexProps {
    modulAjars: ModulAjar[];
    period: string;
}

export default function Index({ modulAjars, period }: IndexProps) {
    const [search, setSearch] = useState('');
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const handleDelete = () => {
        if (deleteId) {
            router.delete(route('lesson-plans.destroy', deleteId));
            setDeleteId(null);
        }
    };

    const filtered = modulAjars.filter(m => 
        m.subject_name?.toLowerCase().includes(search.toLowerCase()) ||
        m.class_name?.toLowerCase().includes(search.toLowerCase()) ||
        m.material_title?.toLowerCase().includes(search.toLowerCase()) ||
        m.tp_desc?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pembelajaran (Modul Ajar) – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-4 sm:gap-5 w-full max-w-full min-w-0 pb-24 sm:pb-12">
                {/* Header Hero Banner (Height ~190px, Rounded 20px, Mobile-First) */}
                <div className="rounded-[20px] bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-5 sm:p-6 text-white shadow-md shadow-indigo-500/10 dark:shadow-none overflow-hidden relative">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between min-w-0">
                        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shrink-0 shadow-inner">
                                <BookOpen className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight truncate">
                                        Modul Ajar & RPP
                                    </h1>
                                    <span className="inline-flex items-center h-6 sm:h-7 rounded-full bg-white/20 px-2.5 text-[11px] font-bold text-white uppercase tracking-wider shrink-0">
                                        PPA 2026 • {period}
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm font-medium text-white/85 mt-1 line-clamp-2 leading-relaxed">
                                    Susun rencana pelaksanaan pembelajaran mendalam berbasis AI dan kurikulum nasional
                                </p>
                            </div>
                        </div>

                        <Link
                            href={route('lesson-plans.create')}
                            className="inline-flex items-center justify-center gap-2 h-12 w-full sm:w-auto px-5 rounded-2xl bg-white text-indigo-600 hover:bg-slate-50 transition font-bold text-sm shadow-md active:scale-98 shrink-0 min-h-[48px]"
                        >
                            <Plus className="h-5 w-5 stroke-[2.5]" />
                            <span>Buat Modul Ajar</span>
                        </Link>
                    </div>
                </div>

                {/* Search Bar (Height 48px, Radius 16px, Non-overflowing single line placeholder) */}
                <div className="relative w-full min-w-0 mt-1">
                    <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Cari berdasarkan mata pelajaran, kelas, atau TP..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-12 rounded-2xl border border-border/80 bg-card pl-11 pr-4 text-xs sm:text-sm text-foreground shadow-2xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition truncate placeholder:text-muted-foreground"
                    />
                </div>

                {/* Modul Ajar Grid/List (Content-driven card height, 16px radius, Clear Information Hierarchy) */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-muted-foreground border border-dashed border-border/80 bg-card rounded-2xl text-center space-y-2 mt-2">
                        <FileText className="h-12 w-12 text-primary/40 mb-1" />
                        <p className="text-sm sm:text-base font-bold text-foreground">Belum ada Modul Ajar</p>
                        <p className="text-xs text-muted-foreground max-w-md">
                            {search ? 'Tidak ada hasil pencarian yang cocok dengan filter.' : 'Silakan klik tombol "Buat Modul Ajar" di atas untuk mulai menyusun Modul Ajar baru.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-3.5 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 w-full min-w-0 mt-1">
                        {filtered.map((m) => (
                            <div 
                                key={m.id} 
                                className="group flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden min-w-0"
                            >
                                <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                                
                                <div className="min-w-0 space-y-2">
                                    {/* 1. Class Badge & Pedagogical Model */}
                                    <div className="flex items-center justify-between gap-2 min-w-0 pt-0.5">
                                        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg line-clamp-1 shrink-0">
                                            {m.class_name}
                                        </span>
                                        <span className="text-xs font-semibold text-muted-foreground truncate">
                                            {m.pedagogical_model}
                                        </span>
                                    </div>

                                    {/* 2. Subject Name (Primary typography ~20px) */}
                                    <h2 className="text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-colors leading-snug truncate">
                                        {m.subject_name}
                                    </h2>
                                    
                                    {/* 3. Material Title (Secondary ~14-15px, max 3 lines) */}
                                    <div className="text-xs sm:text-sm font-semibold text-foreground/90 border-l-2 border-primary/50 pl-2.5 leading-relaxed line-clamp-3 break-words">
                                        Materi: {m.material_title?.replace(/&nbsp;/g, ' ')}
                                    </div>

                                    {/* 4. TP Code & Description (12-13px, max 3 lines) */}
                                    <p className="text-xs text-muted-foreground font-normal leading-relaxed line-clamp-3 break-words pt-1">
                                        <span className="font-bold text-foreground bg-muted px-1.5 py-0.5 rounded text-[11px] mr-1 inline-block">
                                            {m.tp_code}
                                        </span>
                                        {m.tp_desc?.replace(/&nbsp;/g, ' ')}
                                    </p>
                                </div>

                                {/* Card Footer: Date & 44px Accessible Actions */}
                                <div className="mt-4 pt-3.5 border-t border-border/50">
                                    <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 shrink-0">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            {m.created_at}
                                        </span>
                                        
                                        <div className="flex items-center gap-1.5 ml-auto shrink-0">
                                            <Link
                                                href={route('lesson-plans.show', m.id)}
                                                className="h-11 w-11 flex items-center justify-center rounded-xl bg-muted/60 hover:bg-muted text-foreground transition active:scale-95 min-h-[44px] min-w-[44px]"
                                                title="Cetak PDF / Preview"
                                                aria-label="Cetak PDF Modul Ajar"
                                            >
                                                <Printer className="h-5 w-5" />
                                            </Link>
                                            <Link
                                                href={route('lesson-plans.edit', m.id)}
                                                className="h-11 w-11 flex items-center justify-center rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 transition active:scale-95 min-h-[44px] min-w-[44px]"
                                                title="Edit Modul Ajar"
                                                aria-label="Edit Modul Ajar"
                                            >
                                                <Edit2 className="h-5 w-5" />
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => setDeleteId(m.id)}
                                                className="h-11 w-11 flex items-center justify-center rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/80 text-rose-600 dark:text-rose-400 transition cursor-pointer active:scale-95 min-h-[44px] min-w-[44px]"
                                                title="Hapus Modul Ajar"
                                                aria-label="Hapus Modul Ajar"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={deleteId !== null}
                onOpenChange={(open) => { if (!open) setDeleteId(null); }}
                title="Hapus Modul Ajar"
                message="Apakah Anda yakin ingin menghapus Modul Ajar/RPP ini secara permanen?"
                onConfirm={handleDelete}
                requireInput="DELETE"
                inputPlaceholder="Ketik DELETE untuk konfirmasi"
            />
        </AppLayout>
    );
}
