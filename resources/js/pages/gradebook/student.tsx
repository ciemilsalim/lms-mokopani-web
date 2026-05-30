import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { 
    BookOpen, 
    GraduationCap, 
    TrendingUp, 
    CheckCircle2, 
    XCircle,
    Clock,
    Info
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Nilai Saya', href: '/gradebook' },
];

interface SubjectReport {
    subject_name: string;
    cps: {
        id: number;
        label: string;
        description: string;
        tps: {
            id: number;
            label: string;
            assignments: { title: string; score: any; max_points: number; status: string }[];
        }[];
    }[];
    average: number;
    description: string;
    attendance_percentage: number;
    total_meetings: number;
}

interface StudentGradeProps {
    report: SubjectReport[];
    period: string;
}

export default function StudentGrade({ report, period }: StudentGradeProps) {
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

                {/* Subject Cards */}
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
                                            <BookOpen className="h-5 w-5 text-primary" />
                                        </div>
                                        <h3 className="text-lg font-bold text-foreground">{subject.subject_name}</h3>
                                    </div>
                                    <div className="flex items-center gap-6">
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
                                                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pl-4">
                                                                {tp.assignments.map((item, iIdx) => (
                                                                    <div key={iIdx} className="rounded-xl border border-border/50 bg-muted/30 p-4 transition-all hover:bg-muted/50 hover:shadow-sm">
                                                                        <div className="mb-3 flex items-start justify-between">
                                                                            {item.status === 'Selesai' ? (
                                                                                <CheckCircle2 className="h-4 w-4 text-success" />
                                                                            ) : (
                                                                                <Clock className="h-4 w-4 text-warning" />
                                                                            )}
                                                                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${item.status === 'Selesai' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                                                                                {item.status}
                                                                            </span>
                                                                        </div>
                                                                        <h6 className="mb-2 line-clamp-1 text-sm font-bold text-foreground" title={item.title}>
                                                                            {item.title}
                                                                        </h6>
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
                                                    ))}
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
