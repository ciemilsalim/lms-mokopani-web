import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ChevronLeft, AlertTriangle, Users, GraduationCap, TrendingUp, BookOpen, Clock, AlertCircle } from 'lucide-react';
import EarlyWarningBadge from '@/components/analytics/EarlyWarningBadge';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Early Warning', href: '/early-warning' },
    { title: 'Detail', href: '#' },
];

interface Flag {
    type: string;
    level: string;
    label: string;
    message: string;
    icon: string;
}

interface StudentRisk {
    id: number;
    name: string;
    nis: string;
    flags: Flag[];
    highest_risk: string;
    risk_count: number;
}

interface Summary {
    total_students: number;
    at_risk_count: number;
    high_risk_count: number;
    medium_risk_count: number;
    students: StudentRisk[];
}

interface EarlyWarningShowProps {
    subject: { id: number; name: string };
    class: { id: number; name: string };
    summary: Summary;
}

export default function EarlyWarningShow({ subject, class: cls, summary }: EarlyWarningShowProps) {
    const safePct = summary.total_students > 0 ? Math.round((1 - summary.at_risk_count / summary.total_students) * 100) : 100;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Early Warning – ${subject.name} – LMS Mokopani`} />

            <div className="flex h-full flex-1 flex-col gap-6 min-w-0 fade-in">
                <Link
                    href={route('early-warning.index')}
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition w-fit"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Kembali
                </Link>

                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm border-l-4 border-l-rose-500">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                            <AlertTriangle className="h-7 w-7" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">{subject.name} — Kelas {cls.name}</h2>
                            <p className="text-sm text-muted-foreground">Analisis risiko siswa berdasarkan multi-indikator</p>
                        </div>
                        <div className="ml-auto hidden sm:flex items-center gap-2">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{safePct}%</span>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Aman</span>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                    <div className="card-hover rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-foreground">{summary.total_students}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Siswa</p>
                            </div>
                        </div>
                    </div>
                    <div className="card-hover rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{summary.at_risk_count}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Berisiko</p>
                            </div>
                        </div>
                    </div>
                    <div className="card-hover rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                <AlertCircle className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-red-600 dark:text-red-400">{summary.high_risk_count}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Risiko Tinggi</p>
                            </div>
                        </div>
                    </div>
                    <div className="card-hover rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                                <Clock className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{summary.medium_risk_count}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Risiko Sedang</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    <div className="overflow-x-auto scrollbar-thin">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-slate-50/80 dark:bg-slate-900/50">
                                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Siswa</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Tingkat Risiko</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Indikator</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {summary.students.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-20 text-center">
                                            <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
                                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
                                                    <GraduationCap className="h-7 w-7 text-emerald-500" />
                                                </div>
                                                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Tidak ada siswa berisiko untuk kelas ini.</p>
                                                <p className="text-xs text-muted-foreground">Semua siswa menunjukkan performa baik 🎉</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    summary.students.map((s, idx) => {
                                        const riskColor = s.highest_risk === 'high' 
                                            ? 'text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400' 
                                            : 'text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400';
                                        return (
                                            <tr key={s.id} className={`group transition-colors hover:bg-primary/[0.03] dark:hover:bg-primary/[0.06] ${idx % 2 === 1 ? 'bg-slate-50/40 dark:bg-slate-900/20' : ''}`}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-muted/50 dark:text-foreground/80">
                                                            <Users className="h-3.5 w-3.5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-foreground">{s.name}</p>
                                                            <p className="text-[10px] font-mono text-muted-foreground">{s.nis}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${riskColor}`}>
                                                        <AlertTriangle className="h-3 w-3" />
                                                        {s.highest_risk === 'high' ? 'Tinggi' : 'Sedang'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <EarlyWarningBadge flags={s.flags} />
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Link
                                                        href={route('early-warning.student', [subject.id, s.id])}
                                                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-primary opacity-0 transition-all group-hover:opacity-100 hover:bg-primary/10"
                                                    >
                                                        Detail →
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
