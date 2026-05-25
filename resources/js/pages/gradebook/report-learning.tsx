import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ChevronLeft, GraduationCap, CheckCircle2, XCircle } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Penilaian', href: '/gradebook' },
    { title: 'Laporan CP', href: '#' },
];

interface Tp {
    id: number;
    code: string;
    description: string;
}

interface ReportRow {
    student_id: number;
    student_name: string;
    tp_scores: Record<string, { score: number; passed: boolean; kktp: number }>;
    final_score: number;
    passed_tps: number;
    total_tps: number;
    competence: string;
    needs_remedial: boolean;
}

interface ReportLearningProps {
    subject: { id: number; name: string; code: string };
    class: { id: number; name: string };
    tps: Tp[];
    reportData: ReportRow[];
    period: string;
    kktp: number;
}

export default function ReportLearning({ subject, class: cls, tps, reportData, period, kktp }: ReportLearningProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Laporan CP ${subject.name} – LMS Mokopani`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <Link
                        href={route('gradebook.index')}
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Kembali
                    </Link>
                    <h1 className="text-xl font-bold text-foreground">Laporan Capaian Pembelajaran</h1>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex items-center gap-6">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <GraduationCap className="h-7 w-7" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">{subject.name} — Kelas {cls.name}</h2>
                            <p className="text-sm text-muted-foreground">{period}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {tps.length} Tujuan Pembelajaran · KKTP {kktp}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">No</th>
                                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nama Siswa</th>
                                {tps.map((tp) => (
                                    <th key={tp.id} className="px-4 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground min-w-[80px]">
                                        <div title={tp.description}>{tp.code || `TP ${tp.id}`}</div>
                                    </th>
                                ))}
                                <th className="px-4 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nilai Akhir</th>
                                <th className="px-4 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Kompetensi</th>
                                <th className="px-4 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {reportData.map((row, index) => (
                                <tr key={row.student_id} className="transition hover:bg-muted/30">
                                    <td className="px-6 py-3 text-muted-foreground">{index + 1}</td>
                                    <td className="px-6 py-3 font-medium text-foreground">{row.student_name}</td>
                                    {tps.map((tp) => {
                                        const s = row.tp_scores[tp.id];
                                        return (
                                            <td key={tp.id} className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center gap-1 text-sm font-semibold ${s?.passed ? 'text-emerald-600' : s && s.score > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                                    {s?.score ?? '-'}
                                                    {s?.passed ? <CheckCircle2 className="h-3 w-3" /> : s && s.score > 0 ? <XCircle className="h-3 w-3" /> : null}
                                                </span>
                                            </td>
                                        );
                                    })}
                                    <td className="px-4 py-3 text-center font-bold text-foreground">{row.final_score}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                                            row.competence === 'Kompeten'
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                        }`}>
                                            {row.competence}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {row.needs_remedial ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">
但 Perlu Remedial
                                            </span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {reportData.filter(r => r.needs_remedial).length > 0 && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                            ⚠ {reportData.filter(r => r.needs_remedial).length} siswa memerlukan remedial
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                            Siswa dengan nilai di bawah KKTP ({kktp}) disarankan mengikuti program remedial.
                        </p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
