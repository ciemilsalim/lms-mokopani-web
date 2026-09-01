import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    Users, AlertTriangle, TrendingUp, ClipboardList, BarChart3, Target,
    CheckCircle2, XCircle, Clock, AlertCircle, Brain, BookOpen,
    FileSpreadsheet, FileText, FileDown, ChevronLeft, ChevronDown,
    ChevronRight, Filter, Sparkles, PlusCircle, ExternalLink, X, ShieldAlert
} from 'lucide-react';
import PerformanceTrendChart from '@/components/analytics/PerformanceTrendChart';
import ScoreDistributionChart from '@/components/analytics/ScoreDistributionChart';
import EarlyWarningBadge from '@/components/analytics/EarlyWarningBadge';
import { useState, useMemo } from 'react';

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
    questions: {
        id: string;
        text: string;
        type: string;
        correct_count: number;
        total_answers: number;
        difficulty_index: number | null;
        difficulty_level: string;
    }[];
}

interface SubjectAnalyticsProps {
    subject: { id: number; name: string };
    class: { id: number; name: string };
    performance: Performance;
    score_matrix: ScoreMatrix;
    risk_summary: RiskSummary;
    question_analysis: QuestionAnalysis[];
    semesters: { id: number; name: string; is_active: boolean; academic_year: string }[];
    filters: { semester_id: number | null; start_date: string | null; end_date: string | null };
}

export default function SubjectAnalytics({
    subject,
    class: cls,
    performance,
    score_matrix,
    risk_summary,
    question_analysis,
    semesters,
    filters,
}: SubjectAnalyticsProps) {
    // Determine default tab based on whether at-risk students exist
    const [activeTab, setActiveTab] = useState<'early-warning' | 'performance' | 'matrix'>(
        risk_summary.at_risk_count > 0 ? 'early-warning' : 'performance'
    );
    const [riskFilter, setRiskFilter] = useState<'all' | 'high' | 'medium'>('all');
    const [selectedStudent, setSelectedStudent] = useState<AtRiskStudent | null>(null);
    const [expandedStudents, setExpandedStudents] = useState<Record<number, boolean>>({});
    const [showMobileFilter, setShowMobileFilter] = useState(false);

    const [filterData, setFilterData] = useState({
        semester_id: filters?.semester_id || '',
        start_date: filters?.start_date || '',
        end_date: filters?.end_date || '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Analitik', href: '/analytics' },
        { title: `${subject.name} (${cls.name})`, href: '#' },
    ];

    const safePercentage = useMemo(() => {
        if (!risk_summary.total_students) return 100;
        return Math.round((1 - risk_summary.at_risk_count / risk_summary.total_students) * 100);
    }, [risk_summary]);

    const filteredRiskStudents = useMemo(() => {
        if (riskFilter === 'all') return risk_summary.students;
        return risk_summary.students.filter((s) => s.highest_risk === riskFilter);
    }, [risk_summary.students, riskFilter]);

    const toggleStudentExpand = (id: number) => {
        setExpandedStudents((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const applyFilters = (key: string, value: string) => {
        const newData = { ...filterData, [key]: value };
        setFilterData(newData);

        const params: Record<string, string> = {};
        if (newData.semester_id) params.semester_id = newData.semester_id.toString();
        if (newData.start_date) params.start_date = newData.start_date;
        if (newData.end_date) params.end_date = newData.end_date;

        router.get(route('analytics.show', [subject.id, cls.id]), params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const exportToExcel = () => {
        const headers = ['Nama Siswa', 'NIS', ...score_matrix.assignments.map((a) => a.title), 'Rata-rata'];
        const rows = score_matrix.students.map((s) => {
            return [
                s.name,
                s.nis,
                ...s.scores.map((sc) => (sc.score !== null ? sc.score : '-')),
                s.average !== null ? s.average : '-',
            ];
        });
        const csvContent =
            '\uFEFF' +
            [headers.join(','), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Matriks_Nilai_${subject.name}_Kelas_${cls.name}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToWord = () => {
        const title = `Matriks Nilai Siswa: ${subject.name} - Kelas ${cls.name}`;
        const numAssignments = score_matrix.assignments.length;
        const fontSize = numAssignments > 12 ? '7.5pt' : numAssignments > 8 ? '8.5pt' : '9.5pt';

        let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">`;
        html += `<head><meta charset="utf-8"><title>${title}</title>`;
        html += `<style>
            @page Section1 { size: 29.7cm 21.0cm; margin: 1.5cm; }
            div.Section1 { page: Section1; font-family: Calibri, sans-serif; font-size: ${fontSize}; }
            h2 { text-align: center; color: #1e293b; margin-bottom: 4px; }
            p.meta { text-align: center; color: #64748b; font-size: 9pt; margin-top: 0; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 5px 6px; text-align: center; font-size: ${fontSize}; }
            th { background-color: #f1f5f9; font-weight: bold; color: #334155; }
            td.left { text-align: left; }
            .pass { color: #059669; font-weight: bold; }
            .fail { color: #dc2626; font-weight: bold; }
        </style></head><body><div class="Section1">`;

        html += `<h2>${title}</h2>`;
        html += `<p class="meta">Waktu Ekspor: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>`;

        html += `<table><thead><tr><th style="width:28px;">No</th><th class="left">Nama Siswa</th><th>NIS</th>`;
        score_matrix.assignments.forEach((a) => {
            html += `<th>${a.title}</th>`;
        });
        html += `<th>Rata-rata</th></tr></thead><tbody>`;

        score_matrix.students.forEach((s, idx) => {
            html += `<tr><td>${idx + 1}</td><td class="left">${s.name}</td><td>${s.nis}</td>`;
            s.scores.forEach((sc) => {
                if (sc.score === null) {
                    html += `<td>-</td>`;
                } else {
                    html += `<td class="${sc.is_passed ? 'pass' : 'fail'}">${sc.score}</td>`;
                }
            });
            html += `<td style="font-weight:bold;">${s.average !== null ? s.average : '-'}</td></tr>`;
        });

        html += `</tbody></table></div></body></html>`;

        const blob = new Blob(['\uFEFF' + html], { type: 'application/msword;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Matriks_Nilai_${subject.name}_Kelas_${cls.name}.doc`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Analitik – ${subject.name} (${cls.name}) – LMS Mokopani`} />

            <div className="flex h-full flex-1 flex-col gap-5 sm:gap-6 min-w-0 pb-16">
                {/* Back Link & Header */}
                <div className="flex flex-col gap-3">
                    <Link
                        href={route('analytics.index')}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition w-fit py-1"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Kembali ke Daftar Analitik</span>
                    </Link>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
                        <div className="flex items-start sm:items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-lg sm:text-xl font-black text-foreground">
                                    {subject.name} — Kelas {cls.name}
                                </h1>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Pusat Evaluasi Pembelajaran, Deteksi Dini Risiko, dan Matriks Hasil Belajar
                                </p>
                            </div>
                        </div>

                        {/* Filter Trigger / Quick Filters */}
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                            <select
                                value={filterData.semester_id}
                                onChange={(e) => applyFilters('semester_id', e.target.value)}
                                className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="">Semua Semester</option>
                                {semesters.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} {s.is_active ? '(Aktif)' : ''}
                                    </option>
                                ))}
                            </select>

                            <button
                                onClick={() => setShowMobileFilter(!showMobileFilter)}
                                className={`inline-flex sm:hidden h-9 w-9 items-center justify-center rounded-xl border ${
                                    filterData.start_date || filterData.end_date
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border bg-card text-muted-foreground'
                                }`}
                                title="Filter Tanggal"
                            >
                                <Filter className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Expandable Date Filters */}
                    {showMobileFilter && (
                        <div className="sm:hidden grid grid-cols-2 gap-2 p-3 rounded-xl border border-border bg-muted/40 animate-in fade-in slide-in-from-top-2">
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Dari Tanggal</label>
                                <input
                                    type="date"
                                    value={filterData.start_date}
                                    onChange={(e) => applyFilters('start_date', e.target.value)}
                                    className="w-full h-8 mt-1 px-2 text-xs rounded-lg border border-border bg-card"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Sampai Tanggal</label>
                                <input
                                    type="date"
                                    value={filterData.end_date}
                                    onChange={(e) => applyFilters('end_date', e.target.value)}
                                    className="w-full h-8 mt-1 px-2 text-xs rounded-lg border border-border bg-card"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* 3 Main Segmented Tabs */}
                <div className="flex border-b border-border/80 overflow-x-auto scrollbar-none gap-1 sm:gap-2">
                    <button
                        onClick={() => setActiveTab('early-warning')}
                        className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                            activeTab === 'early-warning'
                                ? 'border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20 rounded-t-xl'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                        }`}
                    >
                        <AlertTriangle className="h-4 w-4 text-rose-500" />
                        <span>Early Warning</span>
                        {risk_summary.at_risk_count > 0 ? (
                            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
                                {risk_summary.at_risk_count}
                            </span>
                        ) : (
                            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                Aman
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('performance')}
                        className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                            activeTab === 'performance'
                                ? 'border-primary text-primary bg-primary/5 rounded-t-xl'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                        }`}
                    >
                        <BarChart3 className="h-4 w-4 text-primary" />
                        <span>Performa & Grafik</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('matrix')}
                        className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                            activeTab === 'matrix'
                                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-t-xl'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                        }`}
                    >
                        <ClipboardList className="h-4 w-4 text-indigo-600" />
                        <span>Matriks Nilai & Ekspor</span>
                        <span className="text-[10px] font-mono text-muted-foreground">({score_matrix.students.length})</span>
                    </button>
                </div>

                {/* ======================================================== */}
                {/* TAB 1: EARLY WARNING (SISWA BERISIKO & INTERVENSI CEPAT) */}
                {/* ======================================================== */}
                {activeTab === 'early-warning' && (
                    <div className="flex flex-col gap-5 animate-in fade-in duration-150">
                        {/* Risk Overview Stats */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                                        <CheckCircle2 className="h-5 w-5" />
                                    </div>
                                    <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                        {safePercentage}%
                                    </span>
                                </div>
                                <p className="mt-2 text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Kondisi Aman</p>
                            </div>

                            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                                        <AlertTriangle className="h-5 w-5" />
                                    </div>
                                    <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
                                        {risk_summary.at_risk_count}
                                    </span>
                                </div>
                                <p className="mt-2 text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Total Berisiko</p>
                            </div>

                            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                                        <AlertCircle className="h-5 w-5" />
                                    </div>
                                    <span className="text-xl sm:text-2xl font-black text-red-600 dark:text-red-400">
                                        {risk_summary.high_risk_count}
                                    </span>
                                </div>
                                <p className="mt-2 text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Risiko Tinggi</p>
                            </div>

                            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                                        <Clock className="h-5 w-5" />
                                    </div>
                                    <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
                                        {risk_summary.medium_risk_count}
                                    </span>
                                </div>
                                <p className="mt-2 text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Risiko Sedang</p>
                            </div>
                        </div>

                        {/* List & Controls */}
                        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-border">
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                                        <ShieldAlert className="h-4 w-4 text-rose-500" />
                                        Daftar Siswa Perlu Perhatian
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Klik salah satu siswa untuk membuka rincian faktor risiko dan opsi intervensi remedial
                                    </p>
                                </div>

                                {/* Filter Chips */}
                                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                                    <button
                                        onClick={() => setRiskFilter('all')}
                                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                                            riskFilter === 'all'
                                                ? 'bg-primary text-white shadow-xs'
                                                : 'bg-muted text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Semua ({risk_summary.at_risk_count})
                                    </button>
                                    <button
                                        onClick={() => setRiskFilter('high')}
                                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                                            riskFilter === 'high'
                                                ? 'bg-red-600 text-white shadow-xs'
                                                : 'bg-muted text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Tinggi ({risk_summary.high_risk_count})
                                    </button>
                                    <button
                                        onClick={() => setRiskFilter('medium')}
                                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                                            riskFilter === 'medium'
                                                ? 'bg-amber-600 text-white shadow-xs'
                                                : 'bg-muted text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Sedang ({risk_summary.medium_risk_count})
                                    </button>
                                </div>
                            </div>

                            {filteredRiskStudents.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 mb-3">
                                        <CheckCircle2 className="h-6 w-6" />
                                    </div>
                                    <p className="text-sm font-bold text-foreground">
                                        {riskFilter === 'all'
                                            ? 'Tidak Ada Siswa Berisiko 🎉'
                                            : `Tidak Ada Siswa dengan Kategori Risiko ${riskFilter === 'high' ? 'Tinggi' : 'Sedang'}`}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                                        Semua siswa dalam kelas ini memiliki progres capaian nilai, absensi, dan pengerjaan tugas yang memadai.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {filteredRiskStudents.map((student) => {
                                        const isHigh = student.highest_risk === 'high';
                                        const matrixInfo = score_matrix.students.find((ms) => ms.id === student.id);

                                        return (
                                            <div
                                                key={student.id}
                                                onClick={() => setSelectedStudent(student)}
                                                className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
                                                    isHigh
                                                        ? 'border-red-200/80 bg-red-50/30 hover:border-red-400 dark:border-red-900/40 dark:bg-red-950/20'
                                                        : 'border-amber-200/80 bg-amber-50/30 hover:border-amber-400 dark:border-amber-900/40 dark:bg-amber-950/20'
                                                }`}
                                            >
                                                <div className="flex items-start sm:items-center gap-3 min-w-0">
                                                    <div
                                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-xs ${
                                                            isHigh
                                                                ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                                                        }`}
                                                    >
                                                        <AlertTriangle className="h-5 w-5" />
                                                    </div>

                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                                                                {student.name}
                                                            </span>
                                                            <span className="text-[11px] font-mono text-muted-foreground">
                                                                NIS: {student.nis}
                                                            </span>
                                                            <span
                                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                                    isHigh
                                                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                                                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                                                }`}
                                                            >
                                                                {isHigh ? 'Risiko Tinggi' : 'Risiko Sedang'}
                                                            </span>
                                                        </div>

                                                        {/* Badges */}
                                                        <div className="mt-2">
                                                            <EarlyWarningBadge flags={student.flags} />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                                                    {matrixInfo?.average !== undefined && (
                                                        <div className="text-left sm:text-right">
                                                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Rata-rata</p>
                                                            <p
                                                                className={`text-sm font-black ${
                                                                    (matrixInfo.average ?? 0) >= 70
                                                                        ? 'text-emerald-600'
                                                                        : (matrixInfo.average ?? 0) >= 50
                                                                        ? 'text-amber-600'
                                                                        : 'text-rose-600'
                                                                }`}
                                                            >
                                                                {matrixInfo.average !== null ? matrixInfo.average : '-'}
                                                            </p>
                                                        </div>
                                                    )}

                                                    <div className="inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:translate-x-0.5 transition-transform bg-white/80 dark:bg-card px-3 py-1.5 rounded-lg border border-border shadow-2xs">
                                                        <span>Lihat Detail</span>
                                                        <ChevronRight className="h-3.5 w-3.5" />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ======================================================== */}
                {/* TAB 2: PERFORMA & GRAFIK (TREN, DISTRIBUSI, BUTIR SOAL)  */}
                {/* ======================================================== */}
                {activeTab === 'performance' && (
                    <div className="flex flex-col gap-5 animate-in fade-in duration-150">
                        {/* 4 Performance KPI Cards */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                                        <TrendingUp className="h-4 w-4" />
                                    </div>
                                    <span className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">
                                        {performance.class_avg_score !== null ? performance.class_avg_score : '-'}
                                    </span>
                                </div>
                                <p className="mt-2 text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Rata-rata Kelas</p>
                            </div>

                            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                                        <CheckCircle2 className="h-4 w-4" />
                                    </div>
                                    <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                        {performance.submission_rate}%
                                    </span>
                                </div>
                                <p className="mt-2 text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Pengumpulan Tugas</p>
                            </div>

                            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                                        <ClipboardList className="h-4 w-4" />
                                    </div>
                                    <span className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">
                                        {performance.total_assignments}
                                    </span>
                                </div>
                                <p className="mt-2 text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Total Asesmen</p>
                            </div>

                            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                                        <Brain className="h-4 w-4" />
                                    </div>
                                    <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
                                        {question_analysis.length}
                                    </span>
                                </div>
                                <p className="mt-2 text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Kuis / Ujian Soal</p>
                            </div>
                        </div>

                        {/* Charts 2-Column Grid */}
                        <div className="grid gap-5 lg:grid-cols-2">
                            {/* Performance Trend */}
                            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
                                <div className="mb-4">
                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-primary" />
                                        Tren Rata-rata Nilai Asesmen
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Perkembangan hasil belajar dari tugas awal hingga sumatif akhir
                                    </p>
                                </div>
                                <PerformanceTrendChart data={performance.assignment_scores} />
                            </div>

                            {/* Score Distribution */}
                            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
                                <div className="mb-4">
                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <BarChart3 className="h-4 w-4 text-primary" />
                                        Distribusi Rentang Nilai Siswa
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Sebaran capaian kompetensi seluruh siswa dalam kelas
                                    </p>
                                </div>
                                <ScoreDistributionChart data={performance.score_distribution} />
                            </div>
                        </div>

                        {/* Question Analysis Section */}
                        {question_analysis.length > 0 && (
                            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
                                <div className="mb-4 pb-3 border-b border-border">
                                    <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                                        <Brain className="h-4 w-4 text-indigo-600" />
                                        Analisis Tingkat Kesukaran Butir Soal
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Evaluasi kualitas soal kuis / tes tulis berdasarkan tingkat keberhasilan siswa
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    {question_analysis.map((qa) => (
                                        <div key={qa.assignment_id} className="space-y-3">
                                            <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                                                <span className="h-2 w-2 rounded-full bg-primary" />
                                                {qa.assignment_title}
                                            </h4>

                                            <div className="grid gap-2.5 sm:grid-cols-2">
                                                {qa.questions.map((q, idx) => {
                                                    const diffColor =
                                                        q.difficulty_level === 'mudah'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                            : q.difficulty_level === 'sedang'
                                                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                                                            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400';

                                                    return (
                                                        <div
                                                            key={q.id || idx}
                                                            className="p-3 rounded-xl border border-border bg-muted/20 flex flex-col justify-between gap-2"
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <span className="text-xs font-semibold text-foreground line-clamp-2">
                                                                    {idx + 1}. {q.text || `Soal #${idx + 1}`}
                                                                </span>
                                                                <span
                                                                    className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${diffColor}`}
                                                                >
                                                                    {q.difficulty_level}
                                                                </span>
                                                            </div>

                                                            <div className="space-y-1">
                                                                <div className="flex justify-between text-[11px] text-muted-foreground">
                                                                    <span>Tingkat Keberhasilan:</span>
                                                                    <span className="font-bold text-foreground">
                                                                        {q.difficulty_index !== null ? `${q.difficulty_index}%` : '-'}
                                                                    </span>
                                                                </div>
                                                                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full ${
                                                                            (q.difficulty_index ?? 0) >= 70
                                                                                ? 'bg-emerald-500'
                                                                                : (q.difficulty_index ?? 0) >= 40
                                                                                ? 'bg-amber-500'
                                                                                : 'bg-rose-500'
                                                                        }`}
                                                                        style={{ width: `${Math.min(100, Math.max(0, q.difficulty_index ?? 0))}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ======================================================== */}
                {/* TAB 3: MATRIKS NILAI & EKSPOR                            */}
                {/* ======================================================== */}
                {activeTab === 'matrix' && (
                    <div className="flex flex-col gap-5 animate-in fade-in duration-150">
                        {/* Export Action Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-border bg-card shadow-xs">
                            <div>
                                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                                    Rekap Matriks Nilai Seluruh Tugas
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Unduh rekapitulasi nilai lengkap untuk keperluan pelaporan atau arsip guru
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={exportToExcel}
                                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                                >
                                    <FileSpreadsheet className="h-4 w-4" />
                                    <span>Ekspor Excel (.csv)</span>
                                </button>
                                <button
                                    onClick={exportToWord}
                                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
                                >
                                    <FileText className="h-4 w-4" />
                                    <span>Ekspor Word (.doc)</span>
                                </button>
                            </div>
                        </div>

                        {/* Mobile View: Expandable Student Cards (<768px) */}
                        <div className="md:hidden space-y-2.5">
                            {score_matrix.students.map((student, idx) => {
                                const isExpanded = !!expandedStudents[student.id];

                                return (
                                    <div
                                        key={student.id}
                                        className="rounded-2xl border border-border bg-card p-3.5 shadow-xs transition-all"
                                    >
                                        <div
                                            onClick={() => toggleStudentExpand(student.id)}
                                            className="flex items-center justify-between gap-3 cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                                                    {idx + 1}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-sm text-foreground truncate">{student.name}</p>
                                                    <p className="text-[11px] font-mono text-muted-foreground">{student.nis}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2.5 shrink-0">
                                                <div className="text-right">
                                                    <span className="text-[10px] text-muted-foreground block">Rata-rata</span>
                                                    <span
                                                        className={`text-sm font-black ${
                                                            (student.average ?? 0) >= 70
                                                                ? 'text-emerald-600'
                                                                : (student.average ?? 0) >= 50
                                                                ? 'text-amber-600'
                                                                : 'text-rose-600'
                                                        }`}
                                                    >
                                                        {student.average !== null ? student.average : '-'}
                                                    </span>
                                                </div>
                                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                                    <ChevronDown
                                                        className={`h-3.5 w-3.5 transition-transform duration-200 ${
                                                            isExpanded ? 'rotate-180' : ''
                                                        }`}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expanded Score List */}
                                        {isExpanded && (
                                            <div className="mt-3 pt-3 border-t border-border/80 space-y-2 animate-in fade-in duration-100">
                                                <p className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">
                                                    Nilai per Asesmen:
                                                </p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {score_matrix.assignments.map((assignment, aIdx) => {
                                                        const scoreItem = student.scores[aIdx];
                                                        const val = scoreItem?.score;

                                                        return (
                                                            <div
                                                                key={assignment.id}
                                                                className="p-2 rounded-lg bg-muted/40 border border-border/60 text-xs flex flex-col justify-between"
                                                            >
                                                                <span className="text-[11px] text-muted-foreground truncate font-medium">
                                                                    {assignment.title}
                                                                </span>
                                                                <span
                                                                    className={`text-sm font-black mt-1 ${
                                                                        val === null || val === undefined
                                                                            ? 'text-muted-foreground'
                                                                            : scoreItem?.is_passed
                                                                            ? 'text-emerald-600'
                                                                            : 'text-rose-600'
                                                                    }`}
                                                                >
                                                                    {val !== null && val !== undefined ? val : '-'}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop View: Full Spreadsheet Table (>=768px) */}
                        <div className="hidden md:block overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
                            <div className="overflow-x-auto scrollbar-thin">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/40">
                                            <th className="sticky left-0 z-10 bg-muted/90 px-4 py-3 font-bold uppercase tracking-wider text-muted-foreground w-12 text-center">
                                                No
                                            </th>
                                            <th className="sticky left-12 z-10 bg-muted/90 px-4 py-3 font-bold uppercase tracking-wider text-muted-foreground min-w-[180px]">
                                                Nama Siswa
                                            </th>
                                            <th className="px-4 py-3 font-bold uppercase tracking-wider text-muted-foreground min-w-[100px]">
                                                NIS
                                            </th>
                                            {score_matrix.assignments.map((a) => (
                                                <th
                                                    key={a.id}
                                                    className="px-3 py-3 font-bold text-center text-muted-foreground min-w-[110px]"
                                                >
                                                    <span className="truncate block max-w-[130px] font-semibold">{a.title}</span>
                                                    <span className="text-[10px] text-muted-foreground font-normal">Max: {a.max_points}</span>
                                                </th>
                                            ))}
                                            <th className="sticky right-0 z-10 bg-muted/90 px-4 py-3 font-bold uppercase tracking-wider text-center text-foreground min-w-[90px]">
                                                Rata-rata
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {score_matrix.students.map((student, idx) => (
                                            <tr
                                                key={student.id}
                                                className={`hover:bg-primary/[0.02] transition-colors ${
                                                    idx % 2 === 1 ? 'bg-muted/10' : ''
                                                }`}
                                            >
                                                <td className="sticky left-0 z-1 bg-card px-4 py-2.5 text-center font-bold text-muted-foreground">
                                                    {idx + 1}
                                                </td>
                                                <td className="sticky left-12 z-1 bg-card px-4 py-2.5 font-bold text-foreground">
                                                    {student.name}
                                                </td>
                                                <td className="px-4 py-2.5 font-mono text-muted-foreground">
                                                    {student.nis}
                                                </td>
                                                {student.scores.map((sc, scIdx) => (
                                                    <td key={scIdx} className="px-3 py-2.5 text-center">
                                                        {sc.score === null ? (
                                                            <span className="text-muted-foreground/50">-</span>
                                                        ) : (
                                                            <span
                                                                className={`font-bold inline-block px-2 py-0.5 rounded-md ${
                                                                    sc.is_passed
                                                                        ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                                        : 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400'
                                                                }`}
                                                            >
                                                                {sc.score}
                                                            </span>
                                                        )}
                                                    </td>
                                                ))}
                                                <td className="sticky right-0 z-1 bg-card px-4 py-2.5 text-center font-black text-sm">
                                                    <span
                                                        className={
                                                            (student.average ?? 0) >= 70
                                                                ? 'text-emerald-600'
                                                                : (student.average ?? 0) >= 50
                                                                ? 'text-amber-600'
                                                                : 'text-rose-600'
                                                        }
                                                    >
                                                        {student.average !== null ? student.average : '-'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ======================================================== */}
            {/* INTERACTIVE STUDENT RISK DETAIL MODAL / BOTTOM SHEET     */}
            {/* ======================================================== */}
            {selectedStudent && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedStudent(null)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
                    >
                        {/* Modal Header */}
                        <div className="flex items-start justify-between gap-3 pb-4 border-b border-border">
                            <div className="flex items-center gap-3">
                                <div
                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-black ${
                                        selectedStudent.highest_risk === 'high'
                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                    }`}
                                >
                                    <AlertTriangle className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base text-foreground">{selectedStudent.name}</h3>
                                    <p className="text-xs text-muted-foreground">
                                        NIS: {selectedStudent.nis} &bull; Kelas {cls.name} &bull; {subject.name}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedStudent(null)}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Modal Body: Breakdown of 5 Risk Indicators */}
                        <div className="py-4 space-y-3">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-foreground">Indikator Deteksi Dini:</span>
                                <span
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                        selectedStudent.highest_risk === 'high'
                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                    }`}
                                >
                                    Tingkat Risiko: {selectedStudent.highest_risk === 'high' ? 'Tinggi' : 'Sedang'}
                                </span>
                            </div>

                            {selectedStudent.flags.length === 0 ? (
                                <div className="p-4 rounded-xl bg-muted/30 text-center text-xs text-muted-foreground">
                                    Tidak ada indikator spesifik yang bermasalah.
                                </div>
                            ) : (
                                selectedStudent.flags.map((flag, fIdx) => {
                                    const isFlagHigh = flag.level === 'high';

                                    return (
                                        <div
                                            key={fIdx}
                                            className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                                                isFlagHigh
                                                    ? 'border-red-200 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/30'
                                                    : 'border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/30'
                                            }`}
                                        >
                                            <div
                                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold ${
                                                    isFlagHigh
                                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300'
                                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                                                }`}
                                            >
                                                <AlertCircle className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-bold text-foreground">{flag.label}</span>
                                                    <span
                                                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-md ${
                                                            isFlagHigh
                                                                ? 'bg-red-200/80 text-red-800 dark:bg-red-900/80 dark:text-red-200'
                                                                : 'bg-amber-200/80 text-amber-800 dark:bg-amber-900/80 dark:text-amber-200'
                                                        }`}
                                                    >
                                                        {flag.level === 'high' ? 'Kritis' : 'Waspada'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-foreground/80 mt-1">{flag.message}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Modal Footer: Quick Action Buttons */}
                        <div className="pt-3 border-t border-border flex flex-col sm:flex-row gap-2">
                            <Link
                                href={route('remedial.create')}
                                data={{
                                    subject_id: subject.id,
                                    class_id: cls.id,
                                    student_id: selectedStudent.id,
                                }}
                                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-white shadow-sm transition-all"
                            >
                                <PlusCircle className="h-4 w-4" />
                                <span>Buat Program Remedial</span>
                            </Link>

                            <button
                                onClick={() => setSelectedStudent(null)}
                                className="inline-flex items-center justify-center py-2.5 px-4 rounded-xl text-xs font-bold bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
