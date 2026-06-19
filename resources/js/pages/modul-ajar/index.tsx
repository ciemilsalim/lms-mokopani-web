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
        m.subject_name.toLowerCase().includes(search.toLowerCase()) ||
        m.class_name.toLowerCase().includes(search.toLowerCase()) ||
        m.material_title.toLowerCase().includes(search.toLowerCase()) ||
        m.tp_desc.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pembelajaran (Modul Ajar) – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-6">
                {/* Header Banner */}
                <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-8 text-white shadow-xl shadow-indigo-500/20 dark:shadow-none">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md flex-shrink-0">
                                <BookOpen className="h-10 w-10 text-white" />
                            </div>
                            <div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                    <h1 className="text-2xl font-black">Modul Ajar & RPP</h1>
                                    <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-widest mt-1 sm:mt-0">
                                        PPA 2026 • {period}
                                    </span>
                                </div>
                                <p className="text-sm font-semibold text-white/80 mt-1">
                                    Susun rencana pelaksanaan pembelajaran mendalam berbasis AI dan kurikulum nasional
                                </p>
                            </div>
                        </div>
                        <Link
                            href={route('lesson-plans.create')}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-600 hover:bg-slate-50 transition shadow-lg active:scale-95"
                        >
                            <Plus className="h-4.5 w-4.5" />
                            Buat Modul Ajar
                        </Link>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Cari berdasarkan mata pelajaran, kelas, materi, atau tujuan pembelajaran..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-xl border border-border bg-card px-11 py-3 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
                    />
                </div>

                {/* Modul Ajar Grid/List */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed border-border/60 bg-card rounded-2xl">
                        <FileText className="h-16 w-16 mb-4 opacity-25 text-primary" />
                        <p className="text-base font-bold">Belum ada Modul Ajar</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {search ? 'Tidak ada hasil pencarian yang cocok.' : 'Silakan klik tombol di kanan atas untuk mulai menggenerasi Modul Ajar Anda.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((m) => (
                            <div 
                                key={m.id} 
                                className="group flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                                
                                <div>
                                    {/* Class & Subject */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-1 rounded-lg">
                                            {m.class_name}
                                        </span>
                                        <span className="text-xs font-bold text-muted-foreground">
                                            {m.pedagogical_model}
                                        </span>
                                    </div>

                                    {/* Subject Title */}
                                    <h2 className="mt-4 text-lg font-black text-foreground group-hover:text-primary transition-colors leading-snug">
                                        {m.subject_name}
                                    </h2>
                                    
                                    {/* Material title */}
                                    <div className="mt-2 text-xs font-bold text-muted-foreground border-l-2 border-primary/40 pl-2 leading-relaxed break-words">
                                        Materi: {m.material_title?.replace(/&nbsp;/g, ' ')}
                                    </div>

                                    {/* TP code & desc */}
                                    <p className="mt-4 text-[11px] text-muted-foreground font-semibold leading-relaxed line-clamp-3 break-words">
                                        <span className="font-extrabold text-foreground bg-muted px-1.5 py-0.5 rounded mr-1">
                                            {m.tp_code}
                                        </span>
                                        {m.tp_desc?.replace(/&nbsp;/g, ' ')}
                                    </p>
                                </div>

                                <div className="mt-6">
                                    <div className="h-[1px] bg-border/40 dark:bg-border/20 w-full mb-4" />
                                    
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {m.created_at}
                                        </span>
                                        
                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={route('lesson-plans.show', m.id)}
                                                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground transition"
                                                title="Cetak PDF / Preview"
                                            >
                                                <Printer className="h-4 w-4" />
                                            </Link>
                                            <Link
                                                href={route('lesson-plans.edit', m.id)}
                                                className="p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 transition"
                                                title="Edit Modul Ajar"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Link>
                                            <button
                                                onClick={() => setDeleteId(m.id)}
                                                className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/80 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                                                title="Hapus Modul Ajar"
                                            >
                                                <Trash2 className="h-4 w-4" />
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
