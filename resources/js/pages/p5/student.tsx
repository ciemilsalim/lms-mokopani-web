import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Heart, Target, ChevronRight, BookOpen, Award, Sparkles } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Projek P5', href: '/p5/saya' },
];

interface SubElementScore {
    id: number;
    nama: string;
    nilai: string;
    catatan: string;
}

interface ElementData {
    id: number;
    nama: string;
    sub_elements: SubElementScore[];
}

interface DimensiData {
    id: number;
    kode: string;
    nama: string;
    elements: ElementData[];
}

interface Project {
    id: number;
    judul: string;
    deskripsi: string | null;
    tema: string | null;
    alokasi_waktu: number | null;
    status: string;
    dimensi: DimensiData[];
}

interface StudentP5Props {
    projects: Project[];
    period: string;
}

const nilaiColors: Record<string, string> = {
    'BB': 'bg-red-100 text-red-700 border-red-200',
    'MB': 'bg-amber-100 text-amber-700 border-amber-200',
    'BSH': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'SB': 'bg-blue-100 text-blue-700 border-blue-200',
};

const nilaiLabels: Record<string, string> = {
    'BB': 'Belum Berkembang',
    'MB': 'Mulai Berkembang',
    'BSH': 'Berkembang Sesuai Harapan',
    'SB': 'Sangat Berkembang',
};

export default function StudentP5({ projects, period }: StudentP5Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Projek P5 Saya – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6 max-w-5xl mx-auto w-full">
                <div className="rounded-2xl bg-gradient-to-br from-rose-600 via-rose-500 to-pink-500 p-8 text-white shadow-xl shadow-rose-200 dark:shadow-none">
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
                            <Heart className="h-10 w-10" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black">Projek Penguatan Profil Pelajar Pancasila</h1>
                            <p className="text-sm font-bold text-white/70 uppercase tracking-widest">{period}</p>
                        </div>
                    </div>
                </div>

                {projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted/50 mb-5">
                            <Sparkles className="h-10 w-10 opacity-40" />
                        </div>
                        <p className="text-lg font-bold">Belum ada projek P5</p>
                        <p className="text-sm mt-1">Belum ada projek P5 yang tersedia untuk kelas ini.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {projects.map((project) => (
                            <div key={project.id} className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
                                <div className="border-b border-border bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 px-8 py-6">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 dark:bg-rose-950/40 px-3 py-1 text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest border border-rose-200 dark:border-rose-900/30">
                                                    <Heart className="h-3 w-3" />
                                                    P5
                                                </span>
                                                <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest border ${
                                                    project.status === 'selesai' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' :
                                                    project.status === 'active' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400' :
                                                    'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                                                }`}>
                                                    {project.status === 'selesai' ? 'Selesai' : project.status === 'active' ? 'Aktif' : 'Draft'}
                                                </span>
                                            </div>
                                            <h2 className="text-xl font-black text-foreground">{project.judul}</h2>
                                            {project.tema && (
                                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                    <BookOpen className="h-4 w-4" />
                                                    Tema: <span className="font-semibold">{project.tema}</span>
                                                </p>
                                            )}
                                        </div>
                                        {project.alokasi_waktu && (
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Alokasi Waktu</p>
                                                <p className="text-lg font-black text-foreground">{project.alokasi_waktu} JP</p>
                                            </div>
                                        )}
                                    </div>
                                    {project.deskripsi && (
                                        <p className="mt-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-4">
                                            {project.deskripsi}
                                        </p>
                                    )}
                                </div>

                                <div className="p-8 space-y-8">
                                    {project.dimensi.map((dimensi) => (
                                        <div key={dimensi.id} className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400">
                                                    <Target className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">{dimensi.kode}</p>
                                                    <h3 className="text-sm font-bold text-foreground">{dimensi.nama}</h3>
                                                </div>
                                            </div>

                                            <div className="space-y-4 pl-11">
                                                {dimensi.elements.map((element) => (
                                                    <div key={element.id} className="space-y-2">
                                                        <p className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                                                            <ChevronRight className="h-3 w-3" />
                                                            {element.nama}
                                                        </p>
                                                        <div className="grid gap-2 pl-5">
                                                            {element.sub_elements.map((se) => (
                                                                <div key={se.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium text-foreground truncate">{se.nama}</p>
                                                                        {se.catatan && (
                                                                            <p className="text-xs text-muted-foreground mt-0.5 italic truncate">"{se.catatan}"</p>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-3 ml-4">
                                                                        {se.nilai !== '-' ? (
                                                                            <>
                                                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black border ${nilaiColors[se.nilai] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                                                    <Award className="h-3 w-3" />
                                                                                    {se.nilai}
                                                                                </span>
                                                                                {se.nilai && nilaiLabels[se.nilai] && (
                                                                                    <span className="text-[10px] text-muted-foreground hidden md:inline">{nilaiLabels[se.nilai]}</span>
                                                                                )}
                                                                            </>
                                                                        ) : (
                                                                            <span className="text-xs text-muted-foreground italic">Belum dinilai</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
