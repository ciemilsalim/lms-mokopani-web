import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { 
    BookOpen, 
    GraduationCap, 
    TrendingUp, 
    CheckCircle2, 
    Clock,
    Info,
    ArrowRight
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Nilai Saya', href: '/gradebook' },
];

interface Assignment {
    id: number;
    title: string;
    score: any;
    max_points: number;
    status: string;
    type: string;
    tp_id: number;
    is_remedial?: boolean;
    remedial_status?: string;
}

interface SubjectReport {
    subject_name: string;
    cps: {
        id: number;
        label: string;
        description: string;
        tps: {
            id: number;
            label: string;
            assignments: Assignment[];
        }[];
    }[];
    average: number;
    description: string;
    attendance_percentage: number;
    total_meetings: number;
    has_remedial?: boolean;
}

interface StudentGradeProps {
    report: SubjectReport[];
    period: string;
}

export default function StudentGrade({ report, period }: StudentGradeProps) {
    const [selectedSubjectIndex, setSelectedSubjectIndex] = useState<number>(0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Laporan Nilai Saya – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Header Section */}
                <div className="rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 p-8 text-white shadow-xl shadow-primary/20 dark:shadow-none">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
                                <GraduationCap className="h-10 w-10" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black">Laporan Capaian Belajar</h1>
                                <p className="text-sm font-bold text-white/70 uppercase tracking-widest">{period}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6 rounded-2xl bg-white/10 p-4 backdrop-blur-md">
                            <div className="text-center">
                                <p className="text-[10px] font-bold uppercase text-white/60">Total Mapel</p>
                                <p className="text-2xl font-black">{report.length}</p>
                            </div>
                            <div className="h-8 w-px bg-white/20"></div>
                            <div className="text-center">
                                <p className="text-[10px] font-bold uppercase text-white/60">Kepatuhan</p>
                                <p className="text-2xl font-black">94%</p>
                            </div>
                        </div>
                    </div>
                </div>

                {report.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <BookOpen className="h-16 w-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium">Belum ada data nilai tersedia.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6 md:flex-row md:items-start">
                        {/* Mobile Navigation (Horizontal Scrollable Tabs) */}
                        <div className="flex gap-2 overflow-x-auto pb-3 md:hidden no-scrollbar w-full">
                            {report.map((subject, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedSubjectIndex(idx)}
                                    className={`relative whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-all border flex items-center gap-1.5 ${
                                        selectedSubjectIndex === idx
                                            ? 'bg-primary text-white border-primary shadow-sm font-black'
                                            : 'bg-card text-muted-foreground border-border hover:bg-muted'
                                    }`}
                                >
                                    {subject.subject_name}
                                    {subject.has_remedial && (
                                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Desktop Navigation (Left Sidebar Selector) */}
                        <div className="hidden md:flex flex-col gap-3 w-80 lg:w-96 flex-shrink-0">
                            <div className="text-xs font-black text-muted-foreground uppercase tracking-widest px-2 mb-1">
                                Daftar Mata Pelajaran
                            </div>
                            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-2 custom-scrollbar">
                                {report.map((subject, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedSubjectIndex(idx)}
                                        className={`w-full text-left rounded-2xl p-4 transition-all border flex flex-col gap-2 ${
                                            selectedSubjectIndex === idx
                                                ? 'bg-primary/5 border-primary/40 shadow-sm ring-1 ring-primary/25'
                                                : 'bg-card border-border hover:bg-muted/40'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between w-full">
                                            <span className={`text-sm font-bold truncate max-w-[70%] ${selectedSubjectIndex === idx ? 'text-primary' : 'text-foreground'}`}>
                                                {subject.subject_name}
                                            </span>
                                            {subject.has_remedial && (
                                                <span className="rounded-full bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 text-[9px] font-black text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30 uppercase tracking-wider animate-pulse flex-shrink-0">
                                                    Remedial
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between w-full mt-1">
                                            <span className="text-[10px] text-muted-foreground">
                                                Kehadiran: <span className="font-semibold text-foreground">{subject.attendance_percentage}%</span>
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                Rerata: <span className={`font-semibold text-xs ${selectedSubjectIndex === idx ? 'text-primary' : 'text-foreground'}`}>{subject.average}</span>
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Selected Subject Details Pane */}
                        <div className="flex-1 w-full min-w-0">
                            {(() => {
                                const subject = report[selectedSubjectIndex] || report[0];
                                return (
                                    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all">
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border bg-muted/50 px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-900 shadow-sm flex-shrink-0">
                                                    <BookOpen className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-foreground leading-tight">{subject.subject_name}</h3>
                                                    {subject.has_remedial && (
                                                        <span className="inline-block mt-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/20">
                                                            Terdapat tugas remedial aktif
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6 flex-shrink-0">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Kehadiran</span>
                                                    <span className={`text-xl font-black ${
                                                        subject.attendance_percentage >= 90 ? 'text-success' :
                                                        subject.attendance_percentage >= 75 ? 'text-warning' : 'text-destructive'
                                                    }`}>
                                                        {subject.attendance_percentage}%
                                                        <span className="ml-1 text-[10px] font-medium text-muted-foreground">({subject.total_meetings}x)</span>
                                                    </span>
                                                </div>
                                                <div className="h-8 w-px bg-border"></div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Rata-rata</span>
                                                    <span className="text-xl font-black text-primary">{subject.average}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-6">
                                            <div className="mb-6 rounded-xl bg-primary/10 p-4 text-sm text-primary flex gap-3">
                                                <Info className="h-5 w-5 flex-shrink-0" />
                                                <p><strong>Capaian Kompetensi:</strong> {subject.description}</p>
                                            </div>
                                            <div className="space-y-8">
                                                {subject.cps.map((cp, cIdx) => (
                                                    <div key={cIdx} className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
                                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-b border-border/60">
                                                            <h4 className="text-sm font-black text-primary uppercase tracking-wider mb-1">Capaian Pembelajaran (CP)</h4>
                                                            <p className="text-base font-bold text-foreground">{cp.label}</p>
                                                            {cp.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{cp.description}</p>}
                                                        </div>
                                                        <div className="p-4 space-y-6">
                                                            {cp.tps.map((tp, tIdx) => (
                                                                <div key={tIdx} className="space-y-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="h-6 w-1.5 rounded-full bg-indigo-400"></div>
                                                                        <h5 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                                            {tp.label}
                                                                        </h5>
                                                                    </div>
                                                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 pl-4">
                                                                        {tp.assignments.map((item, iIdx) => (
                                                                            <div 
                                                                                key={iIdx} 
                                                                                className={`rounded-xl border p-4 transition-all hover:shadow-sm flex flex-col justify-between ${
                                                                                    item.is_remedial 
                                                                                        ? 'border-amber-300 dark:border-amber-900 bg-amber-50/15 dark:bg-amber-950/10 hover:bg-amber-50/25 dark:hover:bg-amber-950/15 shadow-sm' 
                                                                                        : 'border-border/50 bg-muted/30 hover:bg-muted/50'
                                                                                }`}
                                                                            >
                                                                                <div>
                                                                                    <div className="mb-3 flex items-start justify-between gap-1">
                                                                                        <div className="flex items-center gap-1.5">
                                                                                            {item.status === 'Selesai' ? (
                                                                                                <CheckCircle2 className={`h-4 w-4 ${item.is_remedial ? 'text-amber-500' : 'text-success'}`} />
                                                                                            ) : (
                                                                                                <Clock className="h-4 w-4 text-warning" />
                                                                                            )}
                                                                                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                                                                                                item.is_remedial 
                                                                                                    ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                                                                                                    : item.status === 'Selesai' 
                                                                                                        ? 'bg-success/10 text-success' 
                                                                                                        : 'bg-warning/10 text-warning'
                                                                                            }`}>
                                                                                                {item.status}
                                                                                            </span>
                                                                                        </div>
                                                                                        {item.is_remedial && (
                                                                                            <span className="rounded-full bg-amber-500 text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1 shadow-sm select-none">
                                                                                                Remedial
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    <h6 className="mb-2 line-clamp-1 text-sm font-bold text-foreground" title={item.title}>
                                                                                        {item.title}
                                                                                    </h6>
                                                                                </div>
                                                                                <div className="flex items-end justify-between mt-3">
                                                                                    <div className="text-2xl font-black text-foreground">
                                                                                        {item.score}
                                                                                        <span className="text-xs font-normal text-muted-foreground"> / {item.max_points}</span>
                                                                                    </div>
                                                                                    {item.is_remedial && item.remedial_status !== 'completed' ? (
                                                                                        <Link
                                                                                            href={route('assignments.show', item.id)}
                                                                                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-[0.97] px-3 py-1.5 text-[10px] font-bold text-white uppercase tracking-wider shadow-sm transition-all"
                                                                                        >
                                                                                            Kerjakan
                                                                                            <ArrowRight className="h-3 w-3" />
                                                                                        </Link>
                                                                                    ) : (
                                                                                        <TrendingUp className="h-4 w-4 text-muted-foreground/30" />
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
);
}
