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

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <Link
                    href={route('early-warning.index')}
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition w-fit"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Kembali
                </Link>

                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                            <AlertTriangle className="h-7 w-7" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">{subject.name} — Kelas {cls.name}</h2>
                            <p className="text-sm text-muted-foreground">Analisis risiko siswa</p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Siswa</p>
                        <p className="text-3xl font-black text-foreground">{summary.total_students}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Berisiko</p>
                        <p className="text-3xl font-black text-rose-600">{summary.at_risk_count}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Risiko Tinggi</p>
                        <p className="text-3xl font-black text-red-600">{summary.high_risk_count}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Risiko Sedang</p>
                        <p className="text-3xl font-black text-amber-600">{summary.medium_risk_count}</p>
                    </div>
                </div>

                <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl shadow-border/30">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/50">
                                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Siswa</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tingkat Risiko</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Indikator</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {summary.students.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-16 text-center text-muted-foreground">
                                            <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                            <p className="text-sm">Tidak ada siswa berisiko untuk kelas ini.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    summary.students.map((s) => {
                                        const riskColor = s.highest_risk === 'high' 
                                            ? 'text-red-600 bg-red-50 dark:bg-red-900/20' 
                                            : 'text-amber-600 bg-amber-50 dark:bg-amber-900/20';
                                        return (
                                            <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <Users className="h-4 w-4 text-muted-foreground" />
                                                        <div>
                                                            <p className="font-bold text-foreground">{s.name}</p>
                                                            <p className="text-[10px] text-muted-foreground">{s.nis}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${riskColor}`}>
                                                        {s.highest_risk === 'high' ? 'Tinggi' : 'Sedang'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <EarlyWarningBadge flags={s.flags} />
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Link
                                                        href={route('early-warning.student', [subject.id, s.id])}
                                                        className="text-xs font-bold text-primary hover:underline"
                                                    >
                                                        Detail
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
