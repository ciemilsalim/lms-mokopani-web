import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { 
    FileSpreadsheet, 
    ChevronRight, 
    BookOpen, 
    Users,
    TrendingUp
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Penilaian', href: '/gradebook' },
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
            <Head title="Laporan Nilai – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-6 min-w-0">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold text-foreground">Penilaian</h1>
                    <p className="text-sm text-muted-foreground">Pilih kelas untuk melihat nilai, laporan CP, dan rapor siswa</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {teachings.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-muted-foreground">
                            <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 opacity-20" />
                            <p>Anda belum memiliki penempatan mengajar aktif.</p>
                        </div>
                    ) : (
                        teachings.map((t) => (
                            <Link
                                key={t.id}
                                href={route('gradebook.show', { class_id: t.class_id, subject_id: t.subject_id })}
                                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary hover:shadow-xl hover:shadow-primary/10 dark:hover:border-primary/70 dark:hover:shadow-none"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white dark:bg-muted">
                                        <BookOpen className="h-6 w-6" />
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>

                                <div className="space-y-1">
                                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                                        {t.subject_name}
                                    </h3>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Users className="h-3 w-3" />
                                        <span>Kelas {t.class_name}</span>
                                    </div>
                                </div>

                                {/* Decorative Background Icon */}
                                <TrendingUp className="absolute -right-4 -bottom-4 h-24 w-24 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity" />
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
