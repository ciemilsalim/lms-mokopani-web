import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Heart, Plus, BookOpen, Calendar, Users, MoreHorizontal, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { router } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Projek P5', href: '/p5' },
];

interface Project {
    id: number;
    judul: string;
    tema: string | null;
    status: string;
    alokasi_waktu: number | null;
    school_class: { name: string };
    academic_year: { name: string };
    semester: { name: string };
}

interface P5IndexProps {
    projects: Project[];
    classes: { class_id: number; class_name: string }[];
}

export default function P5Index({ projects, classes }: P5IndexProps) {
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const handleDelete = () => {
        if (deleteId) {
            router.delete(route('p5.destroy', deleteId));
            setDeleteId(null);
        }
    };

    const statusBadge = (status: string) => {
        const map: Record<string, string> = { draft: 'bg-muted text-muted-foreground', active: 'bg-success/10 text-success', selesai: 'bg-primary/10 text-primary' };
        return map[status] || map.draft;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Projek P5 – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-foreground tracking-tight">Projek Penguatan P5</h1>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Profil Pelajar Pancasila</p>
                    </div>
                    <Link href={route('p5.create')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition shadow-sm">
                        <Plus className="h-4 w-4" /> Buat Projek
                    </Link>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {projects.length === 0 ? (
                        <div className="md:col-span-2 lg:col-span-3 flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-xl bg-muted/30">
                            <Heart className="h-10 w-10 text-muted-foreground/50 mb-3" />
                            <p className="text-sm font-medium text-muted-foreground">Belum ada Projek P5</p>
                            <p className="text-xs text-muted-foreground/70 mt-1">Buat projek penguatan Profil Pelajar Pancasila untuk kelas Anda.</p>
                        </div>
                    ) : (
                        projects.map(project => (
                            <Link key={project.id} href={route('p5.show', project.id)} className="group rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                                        <Heart className="h-5 w-5" />
                                    </div>
                                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusBadge(project.status)}`}>
                                        {project.status}
                                    </span>
                                </div>
                                <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors mb-2">{project.judul}</h3>
                                {project.tema && <p className="text-xs text-muted-foreground mb-3">Tema: {project.tema}</p>}
                                <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {project.school_class.name}</span>
                                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {project.semester.name}</span>
                                    {project.alokasi_waktu && <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {project.alokasi_waktu} JP</span>}
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>

            <ConfirmDialog
                open={deleteId !== null}
                onOpenChange={() => setDeleteId(null)}
                title="Hapus Projek P5?"
                message="Semua data nilai projek ini juga akan dihapus."
                confirmLabel="Hapus"
                onConfirm={handleDelete}
            />
        </AppLayout>
    );
}
