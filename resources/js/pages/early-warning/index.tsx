import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, ChevronRight, BookOpen, Users, TrendingUp } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Early Warning', href: '/early-warning' },
];

interface Teaching {
    subject_id: number;
    subject_name: string;
    class_id: number;
    class_name: string;
}

interface EarlyWarningIndexProps {
    teachings: Teaching[];
}

export default function EarlyWarningIndex({ teachings }: EarlyWarningIndexProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Early Warning System – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6 fade-in">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold text-foreground">Early Warning System</h1>
                    <p className="text-sm text-muted-foreground">Pantau siswa berisiko berdasarkan akademik, disiplin, pemahaman, absensi, dan diagnostik</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {teachings.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-muted-foreground">
                            <AlertTriangle className="h-16 w-16 mx-auto mb-4 opacity-20" />
                            <p>Anda belum memiliki penempatan mengajar aktif.</p>
                        </div>
                    ) : (
                        teachings.map((t) => (
                            <Link
                                key={`${t.subject_id}-${t.class_id}`}
                                href={route('early-warning.show', [t.subject_id, t.class_id])}
                                className="group card-hover relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-rose-400 hover:shadow-xl hover:shadow-rose-500/10"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600 transition-colors group-hover:bg-rose-600 group-hover:text-white dark:bg-rose-900/30">
                                        <AlertTriangle className="h-6 w-6" />
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-rose-500 transition-colors" />
                                </div>

                                <div className="space-y-1">
                                    <h3 className="text-lg font-bold text-foreground group-hover:text-rose-600 transition-colors">
                                        {t.subject_name}
                                    </h3>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Users className="h-3 w-3" />
                                        <span>Kelas {t.class_name}</span>
                                    </div>
                                </div>

                                <TrendingUp className="absolute -right-4 -bottom-4 h-24 w-24 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity" />
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
