import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    BarChart3, BookOpen, GraduationCap, Users, AlertTriangle, ChevronRight,
    ClipboardList, TrendingUp, AlertCircle, ShieldAlert, Sparkles, Search
} from 'lucide-react';
import { useState, useMemo } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Analitik Pembelajaran', href: '/analytics' },
];

interface Teaching {
    subject_id: number;
    subject_name: string;
    class_id: number;
    class_name: string;
    at_risk_count?: number;
    high_risk_count?: number;
    medium_risk_count?: number;
    total_students?: number;
}

interface OverviewStats {
    total_students: number;
    total_subjects: number;
    total_classes: number;
    total_assignments: number;
    total_at_risk: number;
    total_high_risk?: number;
    total_medium_risk?: number;
}

interface AnalyticsIndexProps {
    teachings: Teaching[];
    overview_stats: OverviewStats;
    active_period?: {
        academic_year?: string;
        semester?: string;
    };
}

export default function AnalyticsIndex({ teachings, overview_stats, active_period }: AnalyticsIndexProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredTeachings = useMemo(() => {
        if (!searchQuery.trim()) return teachings;
        const q = searchQuery.toLowerCase();
        return teachings.filter(
            (t) => t.subject_name.toLowerCase().includes(q) || t.class_name.toLowerCase().includes(q)
        );
    }, [teachings, searchQuery]);

    const statCards = [
        {
            label: 'Total Siswa',
            value: overview_stats.total_students,
            icon: Users,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/40',
        },
        {
            label: 'Mata Pelajaran',
            value: overview_stats.total_subjects,
            icon: BookOpen,
            color: 'text-indigo-600 dark:text-indigo-400',
            bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900/40',
        },
        {
            label: 'Rombel Kelas',
            value: overview_stats.total_classes,
            icon: GraduationCap,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/40',
        },
        {
            label: 'Total Tugas',
            value: overview_stats.total_assignments,
            icon: ClipboardList,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/40',
        },
        {
            label: 'Siswa Berisiko (EWS)',
            value: overview_stats.total_at_risk,
            icon: AlertTriangle,
            color: overview_stats.total_at_risk > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400',
            bg: overview_stats.total_at_risk > 0
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50'
                : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800',
            highlight: overview_stats.total_at_risk > 0,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Analitik Pembelajaran & Early Warning – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-5 sm:gap-6 min-w-0 pb-16">
                {/* Header Banner */}
                <div className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/[0.04] p-4 sm:p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <BarChart3 className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground">
                                    Analitik Pembelajaran & Early Warning
                                </h1>
                                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                                    Pusat monitoring performa kelas, identifikasi dini siswa berisiko, dan rekap matriks nilai
                                </p>
                            </div>
                        </div>

                        {active_period?.academic_year && (
                            <div className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                <span>{active_period.academic_year} &bull; {active_period.semester}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {statCards.map((card, idx) => (
                        <div
                            key={card.label}
                            className={`rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md ${card.bg} ${
                                idx === 4 ? 'col-span-2 sm:col-span-1' : ''
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 dark:bg-black/20 shadow-xs">
                                    <card.icon className={`h-4 w-4 ${card.color}`} />
                                </div>
                                <span className={`text-2xl font-black ${card.color}`}>{card.value}</span>
                            </div>
                            <p className="mt-2 text-[11px] font-bold text-foreground/80 tracking-tight">{card.label}</p>
                            {card.highlight && (
                                <p className="text-[10px] font-medium text-rose-600 dark:text-rose-400 mt-0.5">
                                    Perlu intervensi guru
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                {/* Class Selection Section */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                                <GraduationCap className="h-4 w-4 text-primary" />
                                Pilih Kelas & Mata Pelajaran
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Pilih kelas untuk mengakses Early Warning, grafik performa, dan matriks nilai
                            </p>
                        </div>

                        {teachings.length > 3 && (
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Cari kelas atau mapel..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-9 pl-9 pr-3 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>
                        )}
                    </div>

                    {filteredTeachings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-16 text-center text-muted-foreground">
                            <BarChart3 className="mb-3 h-12 w-12 opacity-20" />
                            <p className="text-sm font-semibold text-foreground">Tidak ada data kelas ditemukan</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {searchQuery ? 'Coba ubah kata kunci pencarian Anda.' : 'Anda belum memiliki penugasan mengajar aktif.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredTeachings.map((t) => {
                                const atRisk = t.at_risk_count ?? 0;
                                const highRisk = t.high_risk_count ?? 0;
                                const mediumRisk = t.medium_risk_count ?? 0;

                                return (
                                    <Link
                                        key={`${t.subject_id}-${t.class_id}`}
                                        href={route('analytics.show', [t.subject_id, t.class_id])}
                                        className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 min-h-[110px]"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-white shadow-xs group-hover:scale-105 transition-transform">
                                                    <TrendingUp className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                                        {t.subject_name}
                                                    </h3>
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                                        <span className="inline-flex items-center font-bold px-2 py-0.5 rounded-md bg-muted text-foreground/80 text-[11px]">
                                                            Kelas {t.class_name}
                                                        </span>
                                                        {t.total_students !== undefined && (
                                                            <span className="text-[11px] text-muted-foreground">
                                                                &bull; {t.total_students} Siswa
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/50 text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all">
                                                <ChevronRight className="h-4 w-4" />
                                            </div>
                                        </div>

                                        {/* Status Early Warning pill */}
                                        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                                            <span className="text-[11px] text-muted-foreground font-medium">Status Risiko:</span>
                                            {atRisk > 0 ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50">
                                                    <AlertTriangle className="h-3 w-3 text-rose-500" />
                                                    <span>{atRisk} Siswa Berisiko</span>
                                                    {highRisk > 0 && <span className="text-[10px] opacity-75">({highRisk} Tinggi)</span>}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                    <span>Semua Aman</span>
                                                </span>
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
