import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { 
    BookOpen, 
    Heart, 
    FileBarChart, 
    Info, 
    Award,
    Sparkles,
    CheckCircle2
} from 'lucide-react';
import { StudentResultSummary, SubjectResultCard } from '@/components/results';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Hasil Belajar Saya', href: '/gradebook' },
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

interface SubElementScore {
    id: number;
    nama: string;
    nilai: string;
    catatan: string;
}

interface ElementData {
    id: number;
    nama: string;
    sub_elements: SubElementScore[];
}

interface DimensiData {
    id: number;
    kode: string;
    nama: string;
    elements: ElementData[];
}

interface Project {
    id: number;
    judul: string;
    deskripsi: string | null;
    tema: string | null;
    alokasi_waktu: number | null;
    status: string;
    dimensi: DimensiData[];
}

interface StudentGradeProps {
    report: SubjectReport[];
    p5_projects?: Project[];
    period: string;
}

const nilaiColors: Record<string, string> = {
    'BB': 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400',
    'MB': 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
    'BSH': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
    'SB': 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400',
};

const nilaiLabels: Record<string, string> = {
    'BB': 'Belum Berkembang',
    'MB': 'Mulai Berkembang',
    'BSH': 'Berkembang Sesuai Harapan',
    'SB': 'Sangat Berkembang',
};

export default function StudentGrade({ report = [], p5_projects = [], period }: StudentGradeProps) {
    const [activeTab, setActiveTab] = useState<'academic' | 'p5'>('academic');

    const averageOverall = report.length > 0
        ? Math.round(report.reduce((acc, curr) => acc + (Number(curr.average) || 0), 0) / report.length)
        : 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Hasil Belajar Saya – LMS Mokopani" />

            <div className="space-y-5 sm:space-y-6 fade-in pb-16 md:pb-6 max-w-5xl mx-auto px-4 sm:px-6">
                {/* Header Summary Banner */}
                <StudentResultSummary
                    overallAverage={averageOverall}
                    totalSubjects={report.length}
                    periodStr={period}
                    className="pt-2"
                />

                {/* Tab Switcher: Nilai Mata Pelajaran vs Projek P5 */}
                <div className="flex p-1 bg-muted/80 rounded-2xl border border-border/60 max-w-md">
                    <button
                        type="button"
                        onClick={() => setActiveTab('academic')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer min-h-[44px] ${
                            activeTab === 'academic'
                                ? 'bg-card text-primary shadow-xs'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <FileBarChart className="h-4 w-4" />
                        <span>Mata Pelajaran ({report.length})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('p5')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer min-h-[44px] ${
                            activeTab === 'p5'
                                ? 'bg-card text-primary shadow-xs'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Heart className="h-4 w-4 text-rose-500" />
                        <span>Projek P5 ({p5_projects.length})</span>
                    </button>
                </div>

                {/* TAB 1: NILAI MATA PELAJARAN (MOBILE STUDENT RESULT CARDS) */}
                {activeTab === 'academic' && (
                    <div className="space-y-3">
                        {report.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-card rounded-2xl border border-border p-6 text-center">
                                <BookOpen className="h-12 w-12 mb-3 opacity-20" />
                                <p className="text-sm font-bold text-foreground">Belum ada data nilai tersedia</p>
                                <p className="text-xs text-muted-foreground mt-1">Nilai akan muncul setelah bapak/ibu guru memberikan penilaian.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {report.map((subject, idx) => (
                                    <SubjectResultCard
                                        key={idx}
                                        subjectName={subject.subject_name}
                                        average={subject.average}
                                        description={subject.description}
                                        attendancePercentage={subject.attendance_percentage}
                                        totalMeetings={subject.total_meetings}
                                        cps={subject.cps}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: PROJEK P5 */}
                {activeTab === 'p5' && (
                    <div className="space-y-4">
                        {p5_projects.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-card rounded-2xl border border-border p-6 text-center">
                                <Heart className="h-12 w-12 mb-3 text-rose-400/40" />
                                <p className="text-sm font-bold text-foreground">Belum Ada Projek P5</p>
                                <p className="text-xs text-muted-foreground mt-1">Projek Penguatan Profil Pelajar Pancasila belum didaftarkan untuk kelas Anda.</p>
                            </div>
                        ) : (
                            p5_projects.map((project) => (
                                <div key={project.id} className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs space-y-4">
                                    <div className="space-y-1">
                                        <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                            {project.tema || 'P5 Kurikulum Merdeka'}
                                        </span>
                                        <h3 className="text-sm sm:text-base font-bold text-foreground">{project.judul}</h3>
                                        {project.deskripsi && (
                                            <p className="text-xs text-muted-foreground">{project.deskripsi}</p>
                                        )}
                                    </div>

                                    {/* Dimensions breakdown */}
                                    <div className="space-y-3 pt-2 border-t border-border/60">
                                        {project.dimensi.map((dim) => (
                                            <div key={dim.id} className="space-y-2">
                                                <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                                                    <Sparkles className="h-3.5 w-3.5" />
                                                    <span>{dim.nama}</span>
                                                </h4>
                                                <div className="space-y-1.5">
                                                    {dim.elements.map((el) => (
                                                        <div key={el.id} className="space-y-1 pl-2">
                                                            {el.sub_elements.map((sub) => (
                                                                <div key={sub.id} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/50 text-xs min-h-[44px]">
                                                                    <span className="font-medium text-foreground truncate">{sub.nama}</span>
                                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border shrink-0 ml-2 ${nilaiColors[sub.nilai] || 'bg-muted text-muted-foreground'}`}>
                                                                        {nilaiLabels[sub.nilai] || sub.nilai}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
