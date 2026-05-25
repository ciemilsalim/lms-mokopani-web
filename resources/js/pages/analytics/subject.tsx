import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    Users, AlertTriangle, TrendingUp, ClipboardList, BarChart3, Target,
    CheckCircle2, XCircle, Clock, AlertCircle, Brain, BookOpen
} from 'lucide-react';
import PerformanceTrendChart from '@/components/analytics/PerformanceTrendChart';
import ScoreDistributionChart from '@/components/analytics/ScoreDistributionChart';
import EarlyWarningBadge from '@/components/analytics/EarlyWarningBadge';
import { useState } from 'react';

interface Flag {
    type: string;
    level: string;
    label: string;
    message: string;
    icon: string;
}

interface AtRiskStudent {
    id: number;
    name: string;
    nis: string;
    flags: Flag[];
    highest_risk: string;
    risk_count: number;
}

interface AssignmentScore {
    id: number;
    title: string;
    assessment_type: string;
    max_points: number;
    passing_grade: number;
    avg_score: number | null;
    submission_count: number;
    student_count: number;
    due_date: string | null;
}

interface DistributionItem {
    range: string;
    count: number;
}

interface Performance {
    total_assignments: number;
    total_students: number;
    class_avg_score: number | null;
    submission_rate: number;
    assignment_scores: AssignmentScore[];
    score_distribution: DistributionItem[];
}

interface StudentScore {
    id: number;
    name: string;
    nis: string;
    scores: { score: number | null; is_passed: boolean; passing_grade: number }[];
    average: number | null;
}

interface ScoreMatrix {
    assignments: { id: number; title: string; max_points: number }[];
    students: StudentScore[];
}

interface RiskSummary {
    total_students: number;
    at_risk_count: number;
    high_risk_count: number;
    medium_risk_count: number;
    students: AtRiskStudent[];
}

interface QuestionAnalysis {
    assignment_id: number;
    assignment_title: string;
    questions: { id: string; text: string; type: string; correct_count: number; total_answers: number; difficulty_index: number | null; difficulty_level: string }[];
}

interface SubjectAnalyticsProps {
    subject: { id: number; name: string };
    class: { id: number; name: string };
    performance: Performance;
    score_matrix: ScoreMatrix;
    risk_summary: RiskSummary;
    question_analysis: QuestionAnalysis[];
}

export default function SubjectAnalytics({ subject, class: cls, performance, score_matrix, risk_summary, question_analysis }: SubjectAnalyticsProps) {
    const [selectedStudent, setSelectedStudent] = useState<AtRiskStudent | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Analitik', href: '/analytics' },
        { title: `${subject.name} - ${cls.name}`, href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${subject.name} – Analitik`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-foreground">{subject.name}</h1>
                        <p className="text-sm text-muted-foreground">{cls.name}</p>
                    </div>
                </div>

                {/* Overview Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border bg-card p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <span className="text-2xl font-black text-foreground">{performance.class_avg_score ?? '-'}</span>
                        </div>
                        <p className="mt-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Rata-rata Kelas</p>
                    </div>
                    <div className="rounded-2xl border bg-card p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                                <ClipboardList className="h-5 w-5" />
                            </div>
                            <span className="text-2xl font-black text-foreground">{performance.submission_rate}%</span>
                        </div>
                        <p className="mt-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Pengumpulan Tugas</p>
                    </div>
                    <div className="rounded-2xl border bg-card p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                                <BarChart3 className="h-5 w-5" />
                            </div>
                            <span className="text-2xl font-black text-foreground">{performance.total_assignments}</span>
                        </div>
                        <p className="mt-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Tugas</p>
                    </div>
                    <div className="rounded-2xl border bg-card p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                                risk_summary.at_risk_count > 0
                                    ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400'
                                    : 'bg-muted text-muted-foreground'
                            }`}>
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <span className={`text-2xl font-black ${risk_summary.at_risk_count > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
                                {risk_summary.at_risk_count}
                            </span>
                        </div>
                        <p className="mt-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Siswa Berisiko</p>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Performance Trend */}
                    <div className="rounded-2xl border bg-card p-6 shadow-sm">
                        <h3 className="mb-4 text-sm font-bold text-foreground flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Tren Performa
                        </h3>
                        <PerformanceTrendChart data={performance.assignment_scores} />
                    </div>

                    {/* Score Distribution */}
                    <div className="rounded-2xl border bg-card p-6 shadow-sm">
                        <h3 className="mb-4 text-sm font-bold text-foreground flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-primary" />
                            Distribusi Nilai
                        </h3>
                        <ScoreDistributionChart data={performance.score_distribution} />
                    </div>
                </div>

                {/* Risk Summary */}
                <div className="rounded-2xl border bg-card p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-rose-500" />
                            Siswa Berisiko ({risk_summary.at_risk_count})
                        </h3>
                        <div className="flex items-center gap-3">
                            <div className="flex gap-3 text-[10px] font-bold text-muted-foreground">
                                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Tinggi: {risk_summary.high_risk_count}</span>
                                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Sedang: {risk_summary.medium_risk_count}</span>
                            </div>
                            <Link
                                href="/early-warning"
                                className="text-[10px] font-bold text-rose-600 hover:text-rose-700 underline underline-offset-2"
                            >
                                Detail Early Warning →
                            </Link>
                        </div>
                    </div>

                    {risk_summary.students.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <CheckCircle2 className="mb-3 h-10 w-10 text-emerald-500" />
                            <p className="text-sm font-medium">Tidak ada siswa berisiko</p>
                            <p className="text-xs">Semua siswa menunjukkan performa baik</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        <th className="pb-3 pr-4">Nama</th>
                                        <th className="pb-3 pr-4">NIS</th>
                                        <th className="pb-3 pr-4">Indikator Risiko</th>
                                        <th className="pb-3 text-right">Rata-rata</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {risk_summary.students.map((s) => {
                                        const studentMatrix = score_matrix.students.find(ms => ms.id === s.id);
                                        return (
                                            <tr
                                                key={s.id}
                                                className="border-b last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer"
                                                onClick={() => setSelectedStudent(selectedStudent?.id === s.id ? null : s)}
                                            >
                                                <td className="py-3 pr-4">
                                                    <span className="font-bold text-foreground">{s.name}</span>
                                                </td>
                                                <td className="py-3 pr-4 text-muted-foreground">{s.nis}</td>
                                                <td className="py-3 pr-4">
                                                    <EarlyWarningBadge flags={s.flags} />
                                                </td>
                                                <td className="py-3 text-right">
                                                    <span className={`font-black ${
                                                        (studentMatrix?.average ?? 0) >= 70
                                                            ? 'text-emerald-600'
                                                            : (studentMatrix?.average ?? 0) >= 40
                                                            ? 'text-amber-600'
                                                            : 'text-rose-600'
                                                    }`}>
                                                        {studentMatrix?.average ?? '-'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Expanded student detail */}
                    {selectedStudent && (
                        <div className="mt-4 animate-in slide-in-from-top-2 duration-200 rounded-2xl border border-primary/20 bg-primary/5 p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <Users className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-foreground">{selectedStudent.name}</h4>
                                    <p className="text-xs text-muted-foreground">NIS: {selectedStudent.nis}</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {selectedStudent.flags.map((f, i) => {
                                    const levelColor = f.level === 'high' ? 'border-rose-200 bg-rose-50 dark:border-rose-900/30 dark:bg-rose-950/20' :
                                        f.level === 'medium' ? 'border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-950/20' :
                                        'border-sky-200 bg-sky-50 dark:border-sky-900/30 dark:bg-sky-950/20';
                                    return (
                                        <div key={i} className={`rounded-xl border p-4 ${levelColor}`}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-black uppercase tracking-wider text-foreground">{f.label}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight ${
                                                    f.level === 'high' ? 'bg-rose-200 text-rose-700' :
                                                    f.level === 'medium' ? 'bg-amber-200 text-amber-700' :
                                                    'bg-sky-200 text-sky-700'
                                                }`}>{f.level}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{f.message}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Question Difficulty Analysis */}
                {question_analysis.length > 0 && (
                    <div className="rounded-2xl border bg-card p-6 shadow-sm">
                        <h3 className="mb-5 text-sm font-bold text-foreground flex items-center gap-2">
                            <Brain className="h-4 w-4 text-primary" />
                            Analisis Kesulitan Butir Soal
                        </h3>
                        <div className="space-y-6">
                            {question_analysis.map((qa) => (
                                <div key={qa.assignment_id}>
                                    <h4 className="mb-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">{qa.assignment_title}</h4>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                    <th className="pb-2 pr-4">Soal</th>
                                                    <th className="pb-2 pr-4">Tipe</th>
                                                    <th className="pb-2 pr-4 text-center">Benar</th>
                                                    <th className="pb-2 pr-4 text-center">Total</th>
                                                    <th className="pb-2 pr-4 text-center">Difficulty</th>
                                                    <th className="pb-2 text-right">Level</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {qa.questions.map((q) => (
                                                    <tr key={q.id} className="border-b last:border-b-0">
                                                        <td className="py-2.5 pr-4 text-xs text-foreground font-medium max-w-xs truncate">{q.text}</td>
                                                        <td className="py-2.5 pr-4 text-[10px] font-bold text-muted-foreground uppercase">{q.type}</td>
                                                        <td className="py-2.5 pr-4 text-center font-bold">{q.correct_count}</td>
                                                        <td className="py-2.5 pr-4 text-center font-bold">{q.total_answers}</td>
                                                        <td className="py-2.5 pr-4 text-center">
                                                            {q.difficulty_index !== null ? (
                                                                <span className={`font-black ${
                                                                    q.difficulty_index >= 70 ? 'text-emerald-600' :
                                                                    q.difficulty_index >= 40 ? 'text-amber-600' : 'text-rose-600'
                                                                }`}>{q.difficulty_index}%</span>
                                                            ) : '-'}
                                                        </td>
                                                        <td className="py-2.5 text-right">
                                                            {q.difficulty_level !== 'unknown' && (
                                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-tight ${
                                                                    q.difficulty_level === 'mudah' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                                    q.difficulty_level === 'sedang' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                                    'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                                                }`}>
                                                                    {q.difficulty_level === 'mudah' ? <CheckCircle2 className="h-2.5 w-2.5" /> :
                                                                     q.difficulty_level === 'sedang' ? <AlertCircle className="h-2.5 w-2.5" /> :
                                                                     <XCircle className="h-2.5 w-2.5" />}
                                                                    {q.difficulty_level}
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Student Score Matrix */}
                <div className="rounded-2xl border bg-card p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Target className="h-4 w-4 text-primary" />
                            Matriks Nilai Siswa
                        </h3>
                    </div>

                    {score_matrix.students.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <BarChart3 className="mb-3 h-10 w-10 opacity-20" />
                            <p className="text-sm font-medium">Belum ada data nilai</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        <th className="pb-3 pr-4 sticky left-0 bg-card">Siswa</th>
                                        {score_matrix.assignments.map((a) => (
                                            <th key={a.id} className="pb-3 pr-3 text-center min-w-[60px]" title={a.title}>
                                                {a.title.length > 8 ? a.title.substring(0, 8) + '…' : a.title}
                                            </th>
                                        ))}
                                        <th className="pb-3 text-right">Rata-rata</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {score_matrix.students.map((s) => (
                                        <tr key={s.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                                            <td className="py-2.5 pr-4 sticky left-0 bg-card font-bold text-foreground text-xs">{s.name}</td>
                                            {s.scores.map((sc, i) => (
                                                <td key={i} className="py-2.5 pr-3 text-center">
                                                    <span className={`inline-flex items-center justify-center h-7 w-10 rounded-lg text-[10px] font-black ${
                                                        sc.score === null ? 'bg-muted text-muted-foreground' :
                                                        sc.is_passed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                        'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                                    }`}>
                                                        {sc.score ?? '-'}
                                                    </span>
                                                </td>
                                            ))}
                                            <td className="py-2.5 text-right">
                                                <span className={`font-black text-sm ${
                                                    (s.average ?? 0) >= 70 ? 'text-emerald-600' :
                                                    (s.average ?? 0) >= 40 ? 'text-amber-600' : 'text-rose-600'
                                                }`}>{s.average ?? '-'}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
