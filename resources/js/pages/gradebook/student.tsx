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
    ArrowRight,
    Heart,
    Sparkles,
    FileBarChart,
    ChevronRight,
    Award
} from 'lucide-react';

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
    'BB': 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400',
    'MB': 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400',
    'BSH': 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
    'SB': 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400',
};

const nilaiLabels: Record<string, string> = {
    'BB': 'Belum Berkembang',
    'MB': 'Mulai Berkembang',
    'BSH': 'Berkembang Sesuai Harapan',
    'SB': 'Sangat Berkembang',
};

export default function StudentGrade({ report, p5_projects = [], period }: StudentGradeProps) {
    const [activeTab, setActiveTab] = useState<'academic' | 'p5'>('academic');
    const [selectedSubjectIndex, setSelectedSubjectIndex] = useState<number>(0);

    const averageOverall = report.length > 0
        ? Math.round(report.reduce((acc, curr) => acc + (Number(curr.average) || 0), 0) / report.length)
        : 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Hasil Belajar Saya – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-6 min-w-0 fade-in pb-12 md:pb-6">
                {/* Header Banner */}
                <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-sky-500 p-6 sm:p-8 text-white shadow-xl shadow-indigo-500/10">
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md flex-shrink-0">
                                <Award className="h-8 w-8 sm:h-10 sm:w-10" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-black">Laporan Hasil Belajar</h1>
                                <p className="text-xs sm:text-sm font-semibold text-white/80 mt-0.5 uppercase tracking-wider">{period}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 rounded-2xl bg-white/15 p-3.5 backdrop-blur-md self-start md:self-auto">
                            <div className="text-center px-2">
                                <p className="text-[10px] font-bold uppercase text-white/70">Mata Pelajaran</p>
                                <p className="text-xl font-black">{report.length}</p>
                            </div>
                            <div className="h-8 w-px bg-white/20"></div>
                            <div className="text-center px-2">
                                <p className="text-[10px] font-bold uppercase text-white/70">Rata-rata Nilai</p>
                                <p className="text-xl font-black text-amber-200">{averageOverall}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Switcher: Nilai Mata Pelajaran vs Projek P5 */}
                <div className="flex p-1.5 bg-muted/80 rounded-2xl border border-border/60 max-w-md">
                    <button
                        type="button"
                        onClick={() => setActiveTab('academic')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
                            activeTab === 'academic'
                                ? 'bg-card text-primary shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <FileBarChart className="h-4 w-4" />
                        <span>Nilai Mata Pelajaran ({report.length})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('p5')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
                            activeTab === 'p5'
                                ? 'bg-card text-primary shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Heart className="h-4 w-4 text-rose-500" />
                        <span>Projek P5 ({p5_projects.length})</span>
                    </button>
                </div>

                {/* TAB 1: NILAI MATA PELAJARAN */}
                {activeTab === 'academic' && (
                    <>
                        {report.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card rounded-3xl border border-border">
                                <BookOpen className="h-16 w-16 mb-4 opacity-20" />
                                <p className="text-base font-bold text-foreground">Belum ada data nilai tersedia</p>
                                <p className="text-xs text-muted-foreground mt-1">Nilai akan muncul setelah bapak/ibu guru memberikan penilaian.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                                {/* Mobile Horizontal Subject Tabs */}
                                <div className="flex gap-2 overflow-x-auto pb-2 lg:hidden no-scrollbar w-full">
                                    {report.map((subject, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedSubjectIndex(idx)}
                                            className={`whitespace-nowrap rounded-2xl px-4 py-2 text-xs font-bold transition-all border flex items-center gap-1.5 shrink-0 ${
                                                selectedSubjectIndex === idx
                                                    ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                                                    : 'bg-card text-muted-foreground border-border hover:bg-muted'
                                            }`}
                                        >
                                            {subject.subject_name}
                                            {subject.has_remedial && (
                                                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Desktop Left Sidebar Mapel Selector */}
                                <div className="hidden lg:flex flex-col gap-3 w-80 shrink-0">
                                    <div className="text-xs font-black text-muted-foreground uppercase tracking-widest px-2 mb-1">
                                        Pilih Mata Pelajaran
                                    </div>
                                    <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-2 scrollbar-thin">
                                        {report.map((subject, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setSelectedSubjectIndex(idx)}
                                                className={`w-full text-left rounded-3xl p-4 transition-all border flex flex-col gap-2 cursor-pointer ${
                                                    selectedSubjectIndex === idx
                                                        ? 'bg-primary/10 border-primary/40 shadow-sm ring-2 ring-primary/20'
                                                        : 'bg-card border-border/80 hover:bg-muted/40'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between w-full">
                                                    <span className={`text-sm font-bold truncate max-w-[70%] ${selectedSubjectIndex === idx ? 'text-primary' : 'text-foreground'}`}>
                                                        {subject.subject_name}
                                                    </span>
                                                    {subject.has_remedial && (
                                                        <span className="rounded-full bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 text-[9px] font-black text-amber-600 dark:text-amber-400 border border-amber-200 uppercase tracking-wider animate-pulse shrink-0">
                                                            Remedial
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between w-full mt-1">
                                                    <span className="text-[11px] text-muted-foreground">
                                                        Kehadiran: <strong className="text-foreground">{subject.attendance_percentage}%</strong>
                                                    </span>
                                                    <span className="text-[11px] text-muted-foreground">
                                                        Rata-rata: <strong className={`text-xs ${selectedSubjectIndex === idx ? 'text-primary font-black' : 'text-foreground'}`}>{subject.average}</strong>
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Subject Detail Content */}
                                <div className="flex-1 w-full min-w-0">
                                    {(() => {
                                        const subject = report[selectedSubjectIndex] || report[0];
                                        return (
                                            <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-sm transition-all space-y-6">
                                                {/* Subject Banner Header */}
                                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 bg-muted/20 px-6 py-5">
                                                    <div className="flex items-center gap-3.5">
                                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs shrink-0">
                                                            <BookOpen className="h-6 w-6" />
                                                        </div>
                                                        <div>
                                                            <h2 className="text-lg font-bold text-foreground leading-tight">{subject.subject_name}</h2>
                                                            {subject.has_remedial && (
                                                                <span className="inline-block mt-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-100 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200">
                                                                    Terdapat tugas remedial aktif
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-5 shrink-0">
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Kehadiran</span>
                                                            <span className="text-lg font-black text-emerald-600">
                                                                {subject.attendance_percentage}%
                                                            </span>
                                                        </div>
                                                        <div className="h-8 w-px bg-border/60"></div>
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Rata-rata</span>
                                                            <span className="text-2xl font-black text-primary">{subject.average}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-6 space-y-6">
                                                    {/* Catatan Capaian Belajar Guru */}
                                                    <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4 text-xs sm:text-sm text-primary flex gap-3">
                                                        <Info className="h-5 w-5 shrink-0 mt-0.5" />
                                                        <div>
                                                            <strong className="block mb-0.5">Catatan Capaian Kompetensi Guru:</strong>
                                                            <p className="text-foreground/90 font-medium leading-relaxed">{subject.description}</p>
                                                        </div>
                                                    </div>

                                                    {/* Daftar Nilai Asesmen per Topik */}
                                                    <div className="space-y-6">
                                                        {subject.cps.map((cp, cIdx) => (
                                                            <div key={cIdx} className="rounded-3xl border border-border/70 bg-card/60 shadow-xs overflow-hidden">
                                                                <div className="bg-muted/30 p-4.5 border-b border-border/50">
                                                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                                                                        Topik / Lingkup Materi
                                                                    </span>
                                                                    <h3 className="text-sm font-bold text-foreground mt-0.5">{cp.label}</h3>
                                                                </div>

                                                                <div className="p-5 space-y-5">
                                                                    {cp.tps.map((tp, tIdx) => (
                                                                        <div key={tIdx} className="space-y-3">
                                                                            <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                                                                                {tp.assignments.map((item, iIdx) => (
                                                                                    <div 
                                                                                        key={iIdx} 
                                                                                        className={`rounded-2xl border p-4 transition-all hover:shadow-md flex flex-col justify-between ${
                                                                                            item.is_remedial 
                                                                                                ? 'border-amber-300 dark:border-amber-900 bg-amber-50/20 dark:bg-amber-950/15' 
                                                                                                : 'border-border/60 bg-muted/20 hover:bg-muted/40'
                                                                                        }`}
                                                                                    >
                                                                                        <div>
                                                                                            <div className="mb-2.5 flex items-start justify-between gap-1">
                                                                                                <span className={`rounded-lg px-2 py-0.5 text-[9px] font-black uppercase ${
                                                                                                    item.status === 'Selesai' 
                                                                                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                                                                                                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                                                                                }`}>
                                                                                                    {item.status}
                                                                                                </span>
                                                                                                {item.is_remedial && (
                                                                                                    <span className="rounded-full bg-amber-500 text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider animate-pulse">
                                                                                                        Remedial
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                            <h4 className="line-clamp-2 text-xs font-bold text-foreground" title={item.title}>
                                                                                                {item.title}
                                                                                            </h4>
                                                                                        </div>

                                                                                        <div className="flex items-end justify-between mt-4 pt-2.5 border-t border-border/40">
                                                                                            <div>
                                                                                                <span className="text-[10px] text-muted-foreground block">Nilai Perolehan</span>
                                                                                                <p className="text-xl font-black text-foreground">
                                                                                                    {item.score}
                                                                                                    <span className="text-xs font-normal text-muted-foreground"> / {item.max_points}</span>
                                                                                                </p>
                                                                                            </div>
                                                                                            {item.is_remedial && item.remedial_status !== 'completed' ? (
                                                                                                <Link
                                                                                                    href={route('assignments.show', item.id)}
                                                                                                    className="inline-flex items-center gap-1 rounded-xl bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-[10px] font-bold text-white uppercase shadow-xs transition"
                                                                                                >
                                                                                                    Perbaiki
                                                                                                    <ArrowRight className="h-3 w-3" />
                                                                                                </Link>
                                                                                            ) : (
                                                                                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
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
                    </>
                )}

                {/* TAB 2: PROJEK P5 */}
                {activeTab === 'p5' && (
                    <div className="space-y-6">
                        {p5_projects.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card rounded-3xl border border-border">
                                <Heart className="h-16 w-16 mb-4 text-rose-500/30" />
                                <p className="text-base font-bold text-foreground">Belum ada Projek P5 yang dinilai</p>
                                <p className="text-xs text-muted-foreground mt-1">Capaian Projek Penguatan Profil Pelajar Pancasila akan ditampilkan di sini.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {p5_projects.map((project) => (
                                    <div key={project.id} className="rounded-3xl border border-border/80 bg-card shadow-sm overflow-hidden">
                                        {/* Project Header */}
                                        <div className="border-b border-border/60 bg-gradient-to-r from-rose-50/80 to-pink-50/80 dark:from-rose-950/20 dark:to-pink-950/20 p-6">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                                                            <Heart className="h-3 w-3" /> Projek P5
                                                        </span>
                                                        {project.tema && (
                                                            <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                                                                Tema: {project.tema}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 className="text-lg sm:text-xl font-black text-foreground">
                                                        {project.judul}
                                                    </h3>
                                                    {project.deskripsi && (
                                                        <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                                                            {project.deskripsi}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Dimensi & Sub-elemen */}
                                        <div className="p-6 space-y-6">
                                            {project.dimensi.map((dim) => (
                                                <div key={dim.id} className="rounded-2xl border border-border/60 p-4 sm:p-5 space-y-4 bg-muted/10">
                                                    <div className="flex items-center gap-2">
                                                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                                                        <h4 className="text-sm font-bold text-foreground">
                                                            Dimensi: {dim.nama}
                                                        </h4>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {dim.elements.map((elem) => (
                                                            <div key={elem.id} className="space-y-2">
                                                                <p className="text-xs font-semibold text-muted-foreground">
                                                                    Elemen: {elem.nama}
                                                                </p>
                                                                <div className="grid gap-2.5 sm:grid-cols-2">
                                                                    {elem.sub_elements.map((sub) => {
                                                                        const colorClass = nilaiColors[sub.nilai] || 'bg-muted text-muted-foreground';
                                                                        const label = nilaiLabels[sub.nilai] || sub.nilai;

                                                                        return (
                                                                            <div
                                                                                key={sub.id}
                                                                                className="rounded-xl border border-border/60 bg-card p-3.5 flex items-center justify-between gap-3 shadow-2xs"
                                                                            >
                                                                                <p className="text-xs font-medium text-foreground min-w-0 flex-1">
                                                                                    {sub.nama}
                                                                                </p>
                                                                                <span
                                                                                    className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border shrink-0 ${colorClass}`}
                                                                                    title={label}
                                                                                >
                                                                                    {sub.nilai}
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })}
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
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
