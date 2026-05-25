import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    BookOpen, GraduationCap, TrendingUp, CheckCircle2, Clock, Info, ArrowLeft, Calendar, Users
} from 'lucide-react';

interface AssignmentItem {
    id: number;
    title: string;
    score: any;
    max_points: number;
    status: string;
    type: string;
    tp_id: number | null;
}

interface SubjectReport {
    subject_name: string;
    assignments: AssignmentItem[];
    average: number;
    description: string;
    attendance_percentage: number;
    total_meetings: number;
}

interface StudentData {
    id: number;
    name: string;
    nis: string;
    class_name: string;
}

interface ParentChildProps {
    student: StudentData;
    report: SubjectReport[];
    period: string;
}

export default function ParentChild({ student, report, period }: ParentChildProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Anak Saya', href: '/parent/dashboard' },
        { title: student.name, href: `/parent/child/${student.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${student.name} – Laporan Belajar`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <Link
                    href="/parent/dashboard"
                    className="flex w-fit items-center gap-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Kembali
                </Link>

                <div className="rounded-2xl bg-gradient-to-br from-amber-600 via-amber-600/80 to-orange-600 p-8 text-white shadow-xl shadow-amber-600/20 dark:shadow-none">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
                                <Users className="h-10 w-10" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black">{student.name}</h1>
                                <p className="text-sm font-bold text-white/70 uppercase tracking-widest">
                                    {student.class_name} &middot; NIS: {student.nis}
                                </p>
                                <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest">{period}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6 rounded-2xl bg-white/10 p-4 backdrop-blur-md">
                            <div className="text-center">
                                <p className="text-[10px] font-bold uppercase text-white/60">Total Mapel</p>
                                <p className="text-2xl font-black">{report.length}</p>
                            </div>
                            <div className="h-8 w-px bg-white/20"></div>
                            <div className="text-center">
                                <p className="text-[10px] font-bold uppercase text-white/60">Rata-rata</p>
                                <p className="text-2xl font-black">
                                    {report.length > 0
                                        ? Math.round(report.reduce((sum, s) => sum + s.average, 0) / report.length)
                                        : '-'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6">
                    {report.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <BookOpen className="h-16 w-16 mb-4 opacity-20" />
                            <p className="text-lg font-medium">Belum ada data nilai tersedia.</p>
                        </div>
                    ) : (
                        report.map((subject, sIdx) => (
                            <div key={sIdx} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
                                <div className="flex items-center justify-between border-b border-border bg-muted/50 px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-900 shadow-sm">
                                            <BookOpen className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-foreground">{subject.subject_name}</h3>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                                                <Calendar className="inline h-3 w-3 mr-0.5" />
                                                Kehadiran
                                            </span>
                                            <span className={`text-xl font-black ${
                                                subject.attendance_percentage >= 90 ? 'text-emerald-600' :
                                                subject.attendance_percentage >= 75 ? 'text-amber-600' : 'text-rose-600'
                                            }`}>
                                                {subject.attendance_percentage}%
                                                <span className="ml-1 text-[10px] font-medium text-muted-foreground">({subject.total_meetings}x)</span>
                                            </span>
                                        </div>
                                        <div className="h-8 w-px bg-border"></div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Rata-rata</span>
                                            <span className={`text-xl font-black ${
                                                subject.average >= 75 ? 'text-emerald-600' :
                                                subject.average >= 50 ? 'text-amber-600' : 'text-rose-600'
                                            }`}>{subject.average}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6">
                                    {subject.description && (
                                        <div className="mb-6 rounded-xl bg-amber-600/10 p-4 text-sm text-amber-800 dark:text-amber-200 flex gap-3">
                                            <Info className="h-5 w-5 flex-shrink-0" />
                                            <p><strong>Capaian Kompetensi:</strong> {subject.description}</p>
                                        </div>
                                    )}
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                        {subject.assignments.map((item, iIdx) => (
                                            <div key={iIdx} className="rounded-xl border border-border/50 bg-muted/30 p-4">
                                                <div className="mb-3 flex items-start justify-between">
                                                    {item.status === 'Selesai' ? (
                                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                    ) : (
                                                        <Clock className="h-4 w-4 text-amber-600" />
                                                    )}
                                                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                                                        item.status === 'Selesai'
                                                            ? 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-300'
                                                            : 'bg-amber-600/10 text-amber-700 dark:text-amber-300'
                                                    }`}>
                                                        {item.status}
                                                    </span>
                                                </div>
                                                <h4 className="mb-2 line-clamp-1 text-sm font-bold text-foreground" title={item.title}>
                                                    {item.title}
                                                </h4>
                                                <div className="flex items-end justify-between">
                                                    <div className="text-2xl font-black text-foreground">
                                                        {item.score}
                                                        <span className="text-xs font-normal text-muted-foreground"> / {item.max_points}</span>
                                                    </div>
                                                    <TrendingUp className="h-4 w-4 text-muted-foreground/30" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
