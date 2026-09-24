import React, { useState, useMemo } from 'react';
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
    CheckCircle2,
    Search
} from 'lucide-react';
import { StudentResultSummary, SubjectResultCard } from '@/components/results';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Hasil Belajar', href: '/gradebook' },
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
    'BB': 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    'MB': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    'BSH': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    'SB': 'bg-sky-500/10 text-sky-600 border-sky-500/20',
};

const nilaiLabels: Record<string, string> = {
    'BB': 'Belum Berkembang',
    'MB': 'Mulai Berkembang',
    'BSH': 'Berkembang Sesuai Harapan',
    'SB': 'Sangat Berkembang',
};

export default function StudentGrade({ report = [], p5_projects = [], period }: StudentGradeProps) {
    const [activeTab, setActiveTab] = useState<'academic' | 'p5'>('academic');
    const [searchQuery, setSearchQuery] = useState('');

    const averageOverall = report.length > 0
        ? Math.round(report.reduce((acc, curr) => acc + (Number(curr.average) || 0), 0) / report.length)
        : 0;

    const filteredReports = useMemo(() => {
        if (!searchQuery.trim()) return report;
        const q = searchQuery.toLowerCase();
        return report.filter(r => r.subject_name.toLowerCase().includes(q));
    }, [report, searchQuery]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Hasil Belajar – LMS Mokopani" />

            <div className="space-y-4 sm:space-y-5 fade-in pb-24 sm:pb-8 max-w-7xl mx-auto w-full min-w-0">
                {/* 1. Standardized Page Header (Title: 24-30px, Subtitle: 13-14px) */}
                <div className="w-full min-w-0 space-y-1">
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">
                        Hasil Belajar
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                        Pantau rekap capaian akademik mata pelajaran dan perkembangan Projek Profil Pelajar Pancasila (P5).
                    </p>
                </div>

                {/* 2. Header Summary Banner */}
                <StudentResultSummary
                    overallAverage={averageOverall}
                    totalSubjects={report.length}
                    periodStr={period}
                />

                {/* 3. Tab Switcher & Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                    {/* Tab Switcher: Nilai Mata Pelajaran vs Projek P5 */}
                    <div className="flex p-1 bg-muted/80 rounded-2xl border border-border/60 max-w-md w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => setActiveTab('academic')}
                            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer min-h-[42px] ${
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
                            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer min-h-[42px] ${
                                activeTab === 'p5'
                                    ? 'bg-card text-primary shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Heart className="h-4 w-4 text-rose-500" />
                            <span>Projek P5 ({p5_projects.length})</span>
                        </button>
                    </div>

                    {/* Quick Search when on Academic tab */}
                    {activeTab === 'academic' && report.length > 0 && (
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari mata pelajaran..."
                                className="w-full pl-9 pr-4 py-2 rounded-xl border border-border/70 bg-card text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 min-h-[42px] shadow-2xs"
                            />
                        </div>
                    )}
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
                        ) : filteredReports.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-card rounded-2xl border border-border p-6 text-center">
                                <Search className="h-10 w-10 mb-2 opacity-20" />
                                <p className="text-sm font-bold text-foreground">Tidak ditemukan mata pelajaran "{searchQuery}"</p>
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="mt-2 text-xs font-bold text-primary hover:underline"
                                >
                                    Reset Pencarian
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredReports.map((subject, idx) => (
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
                                        <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 border border-rose-500/20">
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
