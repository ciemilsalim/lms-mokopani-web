import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    BarChart3, BookOpen, GraduationCap, Users, AlertTriangle, ChevronRight,
    ClipboardList, TrendingUp, AlertCircle
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Analitik', href: '/analytics' },
];

interface Teaching {
    subject_id: number;
    subject_name: string;
    class_id: number;
    class_name: string;
}

interface OverviewStats {
    total_students: number;
    total_subjects: number;
    total_classes: number;
    total_assignments: number;
    total_at_risk: number;
}

interface AnalyticsIndexProps {
    teachings: Teaching[];
    overview_stats: OverviewStats;
}

export default function AnalyticsIndex({ teachings, overview_stats }: AnalyticsIndexProps) {
    const statCards = [
        { label: 'Siswa', value: overview_stats.total_students, icon: Users, color: 'text-sky-600 bg-sky-100 dark:text-sky-400 dark:bg-sky-950/30' },
        { label: 'Mapel', value: overview_stats.total_subjects, icon: BookOpen, color: 'text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-950/30' },
        { label: 'Kelas', value: overview_stats.total_classes, icon: GraduationCap, color: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/30' },
        { label: 'Tugas', value: overview_stats.total_assignments, icon: ClipboardList, color: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950/30' },
        { label: 'Berisiko', value: overview_stats.total_at_risk, icon: AlertTriangle, color: overview_stats.total_at_risk > 0 ? 'text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-950/30' : 'text-muted-foreground bg-muted' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Analitik – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div>
                    <h1 className="text-xl font-bold text-foreground">Analitik Pembelajaran</h1>
                    <p className="text-sm text-muted-foreground">
                        Pantau performa kelas, identifikasi siswa berisiko, dan analisis hasil belajar
                    </p>
                </div>

                {/* Stat cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {statCards.map((card) => (
                        <div key={card.label} className="rounded-2xl border bg-card p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.color}`}>
                                    <card.icon className="h-5 w-5" />
                                </div>
                                <span className="text-2xl font-black text-foreground">{card.value}</span>
                            </div>
                            <p className="mt-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">{card.label}</p>
                        </div>
                    ))}
                </div>

                {/* Teaching list */}
                <div>
                    <h2 className="mb-4 text-sm font-bold text-foreground">Pilih Kelas & Mapel</h2>
                    {teachings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <BarChart3 className="mb-4 h-12 w-12 opacity-20" />
                            <p className="text-sm font-medium">Belum ada data pengajaran</p>
                        </div>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {teachings.map((t, i) => (
                                <Link
                                    key={i}
                                    href={route('analytics.show', [t.subject_id, t.class_id])}
                                    className="group flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
                                >
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-white shadow-sm">
                                        <TrendingUp className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                                            {t.subject_name}
                                        </p>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mt-0.5">
                                            {t.class_name}
                                        </p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-0.5" />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
