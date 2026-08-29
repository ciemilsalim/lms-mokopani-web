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
    Sparkles,
    SlidersHorizontal
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Rapor', href: '/gradebook' },
];

interface Teaching {
    id: number;
    subject_id: number;
    subject_name: string;
    class_id: number;
    class_name: string;
}

interface GradebookIndexProps {
    teachings: Teaching[];
}

export default function GradebookIndex({ teachings }: GradebookIndexProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Rapor Hasil Belajar – LMS Mokopani" />

            <div className="space-y-4 sm:space-y-5 fade-in pb-24 sm:pb-8 max-w-7xl mx-auto w-full min-w-0">
                {/* 1. Rapor Header */}
                <div className="flex flex-col gap-1 pt-1">
                    <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                        <Award className="h-6 w-6 text-primary shrink-0" />
                        <span>Rapor Hasil Belajar</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                        Pilih kelas untuk melihat Rapor Akhir dan capaian pembelajaran siswa
                    </p>
                </div>

                {/* 2. Class Cards Grid */}
                <div className="grid gap-3.5 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {teachings.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-muted-foreground border border-dashed border-border/80 rounded-2xl bg-card/40 p-6 space-y-2">
                            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground/30 mb-1" />
                            <h3 className="text-sm font-bold text-foreground">Belum Ada Penempatan Mengajar Aktif</h3>
                            <p className="text-xs text-muted-foreground">Hubungi kurikulum atau admin untuk penugasan mengajar.</p>
                        </div>
                    ) : (
                        teachings.map((t) => (
                            <div
                                key={t.id}
                                className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-primary/60 transition-all duration-200 min-h-[96px] overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-primary via-indigo-500 to-purple-500" />

                                <Link
                                    href={route('gradebook.final-report', { class_id: t.class_id, subject_id: t.subject_id })}
                                    className="block space-y-2 min-w-0"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[11px] font-extrabold text-primary bg-primary/10 px-2.5 py-1 rounded-lg shrink-0">
                                            Kelas {t.class_name}
                                        </span>
                                        <div className="flex items-center gap-1 text-xs font-bold text-primary group-hover:translate-x-1 transition-transform">
                                            <span>Buka Rapor</span>
                                            <ChevronRight className="h-4 w-4" />
                                        </div>
                                    </div>

                                    <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-snug truncate pt-1">
                                        {t.subject_name}
                                    </h3>
                                </Link>

                                <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1.5 text-xs font-medium">
                                        <Award className="h-3.5 w-3.5 text-primary" />
                                        <span>Rapor Akhir & Capaian</span>
                                    </span>

                                    <Link
                                        href={route('gradebook.show', { class_id: t.class_id, subject_id: t.subject_id })}
                                        className="text-[11px] font-bold text-muted-foreground hover:text-primary hover:underline flex items-center gap-1 transition"
                                        title="Buka Alur Asesmen / Gradebook Detail"
                                    >
                                        <SlidersHorizontal className="h-3 w-3" />
                                        <span>Alur Asesmen</span>
                                    </Link>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
