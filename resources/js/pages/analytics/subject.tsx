import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    Users, AlertTriangle, TrendingUp, ClipboardList, BarChart3, Target,
    CheckCircle2, XCircle, Clock, AlertCircle, Brain, BookOpen,
    FileSpreadsheet, FileText, FileDown
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
    semesters: { id: number; name: string; is_active: boolean; academic_year: string }[];
    filters: { semester_id: number | null; start_date: string | null; end_date: string | null };
}

export default function SubjectAnalytics({ subject, class: cls, performance, score_matrix, risk_summary, question_analysis, semesters, filters }: SubjectAnalyticsProps) {
    const [selectedStudent, setSelectedStudent] = useState<AtRiskStudent | null>(null);
    const [filterData, setFilterData] = useState({
        semester_id: filters?.semester_id || '',
        start_date: filters?.start_date || '',
        end_date: filters?.end_date || ''
    });

    const applyFilters = (key: string, value: string) => {
        const newData = { ...filterData, [key]: value };
        setFilterData(newData);
        
        // Clean empty values
        const params: Record<string, string> = {};
        if (newData.semester_id) params.semester_id = newData.semester_id.toString();
        if (newData.start_date) params.start_date = newData.start_date;
        if (newData.end_date) params.end_date = newData.end_date;

        router.get(route('analytics.show', [subject.id, cls.id]), params, { preserveState: true, preserveScroll: true });
    };

    const exportToExcel = () => {
        const headers = ['Siswa', ...score_matrix.assignments.map(a => a.title), 'Rata-rata'];
        const rows = score_matrix.students.map(s => {
            return [
                s.name,
                ...s.scores.map(sc => sc.score !== null ? sc.score : '-'),
                s.average !== null ? s.average : '-'
            ];
        });
        const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Matriks_Nilai_${subject.name}_${cls.name}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToWord = () => {
        const title = `Matriks Nilai Siswa: ${subject.name} - ${cls.name}`;
        const numAssignments = score_matrix.assignments.length;
        const fontSize = numAssignments > 12 ? '7.5pt' : (numAssignments > 8 ? '8.5pt' : (numAssignments > 5 ? '9.5pt' : '10.5pt'));
        const padding = numAssignments > 8 ? '4px 3px' : '6px 5px';

        let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">`;
        html += `<head><meta charset="utf-8"><title>${title}</title>`;
        html += `<style>
            @page Section1 {
                size: 29.7cm 21.0cm;
                margin: 0.5in 0.5in 0.5in 0.5in;
                mso-header-margin: .3in;
                mso-footer-margin: .3in;
                mso-paper-source: 0;
                mso-page-orientation: landscape;
            }
            div.Section1 { page: Section1; }
            body { font-family: Arial, sans-serif; font-size: 11px; }
            h2 { text-align: center; margin-bottom: 20px; font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: auto; }
            th, td { 
                border: 1px solid #cbd5e1; 
                padding: ${padding}; 
                font-size: ${fontSize}; 
                text-align: left; 
                vertical-align: middle;
                word-wrap: break-word;
            }
            th { background-color: #f8fafc; font-weight: bold; color: #475569; }
            .center { text-align: center; }
            .right { text-align: right; }
            .score-pass { color: #10b981; font-weight: bold; }
            .score-fail { color: #f43f5e; font-weight: bold; }
        </style></head><body><div class="Section1">`;
        html += `<h2>${title}</h2>`;
        html += `<table>`;
        html += `<thead><tr>`;
        html += `<th style="max-width: 150px;">Siswa</th>`;
        score_matrix.assignments.forEach(a => {
            html += `<th class="center" style="max-width: 90px; word-wrap: break-word;">${a.title} <br/><span style="font-size: 8pt; font-weight: normal; color: #64748b;">(Max: ${a.max_points})</span></th>`;
        });
        html += `<th class="right" style="max-width: 80px;">Rata-rata</th>`;
        html += `</tr></thead><tbody>`;
        score_matrix.students.forEach(s => {
            html += `<tr>`;
            html += `<td style="max-width: 150px; font-weight: bold;">${s.name}</td>`;
            s.scores.forEach(sc => {
                const scoreClass = sc.score === null ? '' : (sc.is_passed ? 'score-pass' : 'score-fail');
                html += `<td class="center ${scoreClass}">${sc.score ?? '-'}</td>`;
            });
            const avg = s.average ?? 0;
            html += `<td class="right ${avg >= 70 ? 'score-pass' : 'score-fail'}"><strong>${s.average ?? '-'}</strong></td>`;
            html += `</tr>`;
        });
        html += `</tbody></table></div></body></html>`;
        const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Matriks_Nilai_${subject.name}_${cls.name}.doc`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToPdf = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const title = `Matriks Nilai Siswa: ${subject.name} - ${cls.name}`;
        
        let html = '<html><head><title>' + title + '</title>';
        html += '<style>';
        html += 'body { font-family: "Inter", sans-serif; padding: 40px; color: #333; }';
        html += '.header { margin-bottom: 30px; border-bottom: 2px solid #eaeaea; padding-bottom: 15px; }';
        html += '.header h1 { font-size: 20px; margin: 0 0 5px 0; color: #000; }';
        html += '.header p { font-size: 12px; margin: 0; color: #666; }';
        html += 'table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 15px; }';
        html += 'th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }';
        html += 'th { background-color: #f8fafc; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em; }';
        html += '.center { text-align: center; }';
        html += '.right { text-align: right; }';
        html += '.badge { padding: 3px 6px; border-radius: 4px; font-weight: 700; font-size: 10px; }';
        html += '.badge-pass { background-color: #d1fae5; color: #065f46; }';
        html += '.badge-fail { background-color: #fee2e2; color: #991b1b; }';
        html += '.badge-null { background-color: #f1f5f9; color: #64748b; }';
        html += '.avg-text { font-weight: 700; font-size: 12px; }';
        html += '.avg-high { color: #059669; }';
        html += '.avg-mid { color: #d97706; }';
        html += '.avg-low { color: #dc2626; }';
        html += '@media print { body { padding: 0; } @page { size: A4 landscape; margin: 1.5cm; } }';
        html += '</style></head><body>';
        
        html += '<div class="header">';
        html += '<h1>Matriks Nilai Siswa</h1>';
        html += '<p>Mata Pelajaran: <strong>' + subject.name + '</strong> &middot; Kelas: <strong>' + cls.name + '</strong></p>';
        html += '<p>Waktu Cetak: ' + new Date().toLocaleString('id-ID') + '</p>';
        html += '</div>';
        
        html += '<table><thead><tr>';
        html += '<th>Nama Siswa</th>';
        score_matrix.assignments.forEach(a => {
            html += '<th class="center">' + a.title + '</th>';
        });
        html += '<th class="right">Rata-rata</th>';
        html += '</tr></thead><tbody>';
        
        score_matrix.students.forEach(s => {
            html += '<tr>';
            html += '<td><strong>' + s.name + '</strong></td>';
            s.scores.forEach(sc => {
                if (sc.score === null) {
                    html += '<td class="center"><span class="badge badge-null">-</span></td>';
                } else {
                    const badgeClass = sc.is_passed ? 'badge-pass' : 'badge-fail';
                    html += '<td class="center"><span class="badge ' + badgeClass + '">' + sc.score + '</span></td>';
                }
            });
            const avg = s.average ?? 0;
            const avgClass = avg >= 70 ? 'avg-high' : (avg >= 40 ? 'avg-mid' : 'avg-low');
            html += '<td class="right"><span class="avg-text ' + avgClass + '">' + (s.average ?? '-') + '</span></td>';
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        html += '<script>window.onload = function() { window.print(); window.close(); };</script>';
        html += '</body></html>';
        
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Analitik', href: '/analytics' },
        { title: `${subject.name} - ${cls.name}`, href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${subject.name} – Analitik`} />

            <div className="flex h-full flex-1 flex-col gap-6 min-w-0 fade-in">
                {/* Header & Filters */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-foreground">{subject.name}</h1>
                        <p className="text-sm text-muted-foreground">{cls.name}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 rounded-2xl border border-border bg-card p-2 shadow-sm">
                        <select
                            value={filterData.semester_id}
                            onChange={(e) => applyFilters('semester_id', e.target.value)}
                            className="w-full sm:w-auto rounded-xl border-none bg-muted/50 px-3 py-2 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="">Semua Semester</option>
                            {semesters?.map(s => (
                                <option key={s.id} value={s.id}>{s.academic_year} - {s.name}</option>
                            ))}
                        </select>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <input
                                type="date"
                                value={filterData.start_date}
                                onChange={(e) => applyFilters('start_date', e.target.value)}
                                className="w-full rounded-xl border-none bg-muted/50 px-3 py-2 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <span className="text-muted-foreground text-xs">-</span>
                            <input
                                type="date"
                                value={filterData.end_date}
                                onChange={(e) => applyFilters('end_date', e.target.value)}
                                className="w-full rounded-xl border-none bg-muted/50 px-3 py-2 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                    </div>
                </div>

                {/* Overview Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="card-hover rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <span className="text-2xl font-black text-foreground">{performance.class_avg_score ?? '-'}</span>
                        </div>
                        <p className="mt-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Rata-rata Kelas</p>
                    </div>
                    <div className="card-hover rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                                <ClipboardList className="h-5 w-5" />
                            </div>
                            <span className="text-2xl font-black text-foreground">{performance.submission_rate}%</span>
                        </div>
                        <p className="mt-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Pengumpulan Tugas</p>
                    </div>
                    <div className="card-hover rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                                <BarChart3 className="h-5 w-5" />
                            </div>
                            <span className="text-2xl font-black text-foreground">{performance.total_assignments}</span>
                        </div>
                        <p className="mt-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Tugas</p>
                    </div>
                    <div className="card-hover rounded-2xl border border-border bg-card p-5 shadow-sm">
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
                    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                        <h3 className="mb-1 text-sm font-bold text-foreground flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Tren Performa
                        </h3>
                        <p className="mb-4 text-[11px] text-muted-foreground">Rata-rata nilai per asesmen sepanjang waktu</p>
                        <PerformanceTrendChart data={performance.assignment_scores} />
                    </div>

                    {/* Score Distribution */}
                    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                        <h3 className="mb-1 text-sm font-bold text-foreground flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-primary" />
                            Distribusi Nilai
                        </h3>
                        <p className="mb-4 text-[11px] text-muted-foreground">Persebaran siswa berdasarkan rentang nilai</p>
                        <ScoreDistributionChart data={performance.score_distribution} />
                    </div>
                </div>

                {/* Risk Summary */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
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
                        <div className="overflow-x-auto scrollbar-thin">
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
                                                className={`border-b last:border-b-0 transition-colors cursor-pointer hover:bg-primary/[0.03] dark:hover:bg-primary/[0.06] ${risk_summary.students.indexOf(s) % 2 === 1 ? 'bg-slate-50/40 dark:bg-slate-900/20' : ''}`}
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

                {/* Student Score Matrix */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 border-b border-border pb-4">
                        <div>
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Target className="h-4 w-4 text-primary" />
                                Matriks Nilai Siswa
                            </h3>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Ringkasan perolehan nilai seluruh tugas dan ujian siswa</p>
                        </div>
                        {score_matrix.students.length > 0 && (
                            <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2">
                                <button
                                    onClick={exportToPdf}
                                    className="w-full sm:w-auto inline-flex justify-center items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition duration-150 shadow-sm cursor-pointer"
                                >
                                    <FileDown className="h-3.5 w-3.5 text-rose-500" />
                                    PDF
                                </button>
                                <button
                                    onClick={exportToExcel}
                                    className="w-full sm:w-auto inline-flex justify-center items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition duration-150 shadow-sm cursor-pointer"
                                >
                                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                                    Spreadsheet
                                </button>
                                <button
                                    onClick={exportToWord}
                                    className="w-full sm:w-auto inline-flex justify-center items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition duration-150 shadow-sm cursor-pointer"
                                >
                                    <FileText className="h-3.5 w-3.5 text-blue-500" />
                                    Docs
                                </button>
                            </div>
                        )}
                    </div>

                    {score_matrix.students.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <BarChart3 className="mb-3 h-10 w-10 opacity-20" />
                            <p className="text-sm font-medium">Belum ada data nilai</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto scrollbar-thin rounded-xl border border-border/60">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="border-b bg-slate-50/80 dark:bg-slate-900/50 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                        <th className="py-3 px-4 sticky left-0 bg-slate-50/80 dark:bg-slate-900/50 z-10 border-r border-border/80 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Siswa</th>
                                        {score_matrix.assignments.map((a) => (
                                            <th key={a.id} className="py-3 px-3 text-center min-w-[100px] border-r border-border/40 last:border-r-0" title={a.title}>
                                                <div className="font-semibold text-foreground truncate max-w-[120px]">{a.title}</div>
                                                <div className="text-[9px] font-normal text-muted-foreground mt-0.5">Max: {a.max_points}</div>
                                            </th>
                                        ))}
                                        <th className="py-3 px-4 text-right">Rata-rata</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {score_matrix.students.map((s, idx) => (
                                        <tr key={s.id} className={`border-b last:border-b-0 transition-colors hover:bg-primary/[0.03] dark:hover:bg-primary/[0.06] ${idx % 2 === 1 ? 'bg-slate-50/40 dark:bg-slate-900/20' : ''}`}>
                                            <td className={`py-2.5 px-4 sticky left-0 z-10 border-r border-border/80 font-bold text-foreground text-xs shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${idx % 2 === 1 ? 'bg-slate-50/40 dark:bg-slate-900/20' : 'bg-card'}`}>{s.name}</td>
                                            {s.scores.map((sc, i) => (
                                                <td key={i} className="py-2.5 px-3 text-center border-r border-border/40 last:border-r-0">
                                                    <span className={`inline-flex items-center justify-center h-7 w-10 rounded-lg text-[10px] font-black ${
                                                        sc.score === null ? 'bg-muted text-muted-foreground' :
                                                        sc.is_passed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                        'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                                    }`}>
                                                        {sc.score ?? '-'}
                                                    </span>
                                                </td>
                                            ))}
                                            <td className="py-2.5 px-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className={`font-black text-sm ${
                                                        (s.average ?? 0) >= 70 ? 'text-emerald-600' :
                                                        (s.average ?? 0) >= 40 ? 'text-amber-600' : 'text-rose-600'
                                                    }`}>{s.average ?? '-'}</span>
                                                    {s.average !== null && performance.class_avg_score !== null && (
                                                        <span className={`text-[9px] font-bold mt-0.5 px-1.5 py-0.5 rounded-full ${
                                                            s.average > performance.class_avg_score 
                                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                                                : s.average < performance.class_avg_score
                                                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                        }`}>
                                                            {s.average > performance.class_avg_score ? '+' : ''}
                                                            {(s.average - performance.class_avg_score).toFixed(1)} vs Rata-rata
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Question Difficulty Analysis */}
                {question_analysis.length > 0 && (
                    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
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
            </div>
        </AppLayout>
    );
}
