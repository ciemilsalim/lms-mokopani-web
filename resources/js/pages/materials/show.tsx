import React, { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    BookOpen, CheckCircle2, FileText, Sparkles, MessageSquare, Download,
    ExternalLink, Trash2, Edit, User, Calendar, Lock, Unlock, ChevronLeft,
    Maximize2, Minimize2, ZoomIn, ZoomOut, X, BarChart3, Users, ChevronDown,
    ChevronUp, Star, Smile, HelpCircle, Zap, Clock, ThumbsUp
} from 'lucide-react';
import {
    MaterialDetailHeader,
    MaterialResourcesSection,
    LearningStepsSection,
    type ResourceItem
} from '@/components/materials';
import { ConfirmDialog } from '@/components/confirm-dialog';
import CommentSection from '@/components/CommentSection';
import ReflectionForm from '@/components/ReflectionForm';

interface Material {
    id: number;
    title: string;
    content: string | null;
    thumbnail: string | null;
    file_path: string | null;
    file_type: string | null;
    external_link: string | null;
    subject_name: string;
    teacher_name: string;
    teacher_id: number;
    teacher_nip: string | null;
    school_class_name: string | null;
    fase: string | null;
    semester_name: string | null;
    academic_year_name: string | null;
    pedagogical_model: string | null;
    learning_environment: string | null;
    understanding_activity: string | null;
    application_activity: string | null;
    reflection_activity: string | null;
    image_prompt: string | null;
    lkpd: string | null;
    tp_code: string | null;
    tp_desc: string | null;
    resources?: ResourceItem[];
    created_at: string;
    access_status?: 'auto' | 'open' | 'locked';
}

interface ClassStudent {
    id: number;
    name: string;
    nis: string;
    photo: string | null;
    class_name: string;
    is_completed: boolean;
}

interface ClassStats {
    total_students: number;
    completed_students: number;
    percentage: number;
    students: ClassStudent[];
}

interface StudentReflection {
    id: number;
    student_name: string;
    student_photo: string | null;
    understanding_level: number;
    interesting_thing: string | null;
    difficulty: string | null;
    created_at: string;
}

interface ShowMaterialProps {
    material: Material;
    comments?: any[];
    my_reflection?: any;
    all_reflections?: StudentReflection[];
    class_stats?: ClassStats | null;
    is_completed?: boolean;
    user_role: string;
    auth_id: number;
    assignments?: any[];
    school_name?: string;
    class_id?: number | null;
    subject_id?: number | null;
}

export default function MaterialShow({
    material,
    comments = [],
    my_reflection,
    all_reflections = [],
    class_stats,
    is_completed = false,
    user_role = 'student',
    auth_id,
    assignments = [],
    school_name,
    class_id,
    subject_id,
}: ShowMaterialProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [focusFontSize, setFocusFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
    const [showStudentList, setShowStudentList] = useState(false);
    const [studentFilter, setStudentFilter] = useState<'all' | 'completed' | 'pending'>('all');

    const isTeacher = user_role === 'teacher' || user_role === 'admin';
    const isStudent = user_role === 'student';

    // Rata-rata bintang refleksi pemahaman siswa untuk guru
    const averageUnderstanding = React.useMemo(() => {
        if (!all_reflections || all_reflections.length === 0) return 0;
        const total = all_reflections.reduce((sum, r) => sum + (r.understanding_level || 0), 0);
        return Math.round((total / all_reflections.length) * 10) / 10;
    }, [all_reflections]);

    // Filter daftar siswa kelas
    const filteredClassStudents = React.useMemo(() => {
        if (!class_stats?.students) return [];
        return class_stats.students.filter((s) => {
            if (studentFilter === 'completed') return s.is_completed;
            if (studentFilter === 'pending') return !s.is_completed;
            return true;
        });
    }, [class_stats, studentFilter]);

    // Keyboard shortcut Escape untuk keluar dari Mode Fokus
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFocusMode) {
                setIsFocusMode(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFocusMode]);

    // Find class name if class_id provided
    const targetClass = class_id && (material as any).school_classes?.find((c: any) => c.id === class_id);
    const targetClassName = targetClass ? targetClass.name : (material.school_class_name || 'Detail Kelas');

    const backUrl = class_id 
        ? `/classes/${class_id}?tab=materials` 
        : subject_id
            ? `/subjects/${subject_id}`
            : '/materials';

    const breadcrumbs: BreadcrumbItem[] = isStudent ? [
        { title: 'Beranda', href: '/dashboard' },
        { title: 'Bahan Materi', href: '/materials' },
        { title: material.title, href: `/materials/${material.id}` },
    ] : class_id ? [
        { title: 'Daftar Kelas', href: '/classes' },
        { title: targetClassName, href: `/classes/${class_id}?tab=materials` },
        { title: material.title, href: `/materials/${material.id}?class_id=${class_id}` },
    ] : subject_id ? [
        { title: 'Mata Pelajaran', href: '/subjects' },
        { title: material.subject_name || 'Detail Mapel', href: `/subjects/${subject_id}` },
        { title: material.title, href: `/materials/${material.id}?subject_id=${subject_id}` },
    ] : [
        { title: 'Bahan Materi', href: '/materials' },
        { title: material.title, href: `/materials/${material.id}` },
    ];

    const handleMarkComplete = () => {
        router.post(route('materials.complete', material.id), {}, { preserveScroll: true });
    };

    const handleDeleteConfirm = () => {
        router.delete(route('materials.destroy', material.id));
    };

    const proseFontSizeClass = 
        focusFontSize === 'xlarge' ? 'text-lg sm:text-xl leading-loose' :
        focusFontSize === 'large' ? 'text-base sm:text-lg leading-relaxed' :
        'text-sm sm:text-base leading-relaxed';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${material.title} - LMS Mokopani`} />

            <div className="space-y-4 sm:space-y-5 fade-in pb-16 md:pb-6 max-w-4xl mx-auto w-full min-w-0 max-w-full">
                {/* 1. Contextual Header Banner */}
                <MaterialDetailHeader
                    id={material.id}
                    title={material.title}
                    subjectName={material.subject_name}
                    className={targetClass ? targetClass.name : material.school_class_name}
                    tpCode={material.tp_code}
                    tpDesc={material.tp_desc}
                    teacherName={material.teacher_name}
                    createdAt={material.created_at}
                    commentsCount={comments.length}
                    accessStatus={material.access_status}
                    isTeacher={isTeacher}
                    onDelete={() => setIsDeleting(true)}
                    backUrl={backUrl}
                />

                {/* Quick Reading Actions & Navigation */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-card border border-border/70 shadow-2xs">
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsFocusMode(true)}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground font-bold text-xs transition active:scale-95 min-h-[40px] cursor-pointer shadow-2xs"
                            title="Buka Mode Membaca Fokus (Bebas Gangguan)"
                        >
                            <Maximize2 className="h-4 w-4" />
                            <span>Mode Fokus</span>
                        </button>

                        {isStudent && (
                            <a
                                href="#refleksi"
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold transition min-h-[40px] border border-amber-500/20"
                            >
                                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                                <span>Jurnal Refleksi {my_reflection ? '✅' : ''}</span>
                            </a>
                        )}

                        {isTeacher && all_reflections && all_reflections.length > 0 && (
                            <a
                                href="#refleksi-guru"
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold transition min-h-[40px] border border-amber-500/20"
                            >
                                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                                <span>Refleksi Siswa ({all_reflections.length})</span>
                            </a>
                        )}

                        <a
                            href="#diskusi"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold transition min-h-[40px]"
                        >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>Diskusi ({comments.length})</span>
                        </a>
                    </div>

                    {isStudent && (
                        <div>
                            {is_completed ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span>Selesai Dipelajari</span>
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleMarkComplete}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xs hover:bg-primary/90 transition active:scale-95 min-h-[40px] cursor-pointer"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span>Tandai Selesai</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* 2. Tujuan Pembelajaran (Explicit Goal Card) */}
                {material.tp_desc && (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-foreground space-y-1 fade-in w-full min-w-0 max-w-full overflow-hidden">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-700">
                            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                            <span>Tujuan Pembelajaran {material.tp_code ? `(TP: ${material.tp_code})` : ''}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed pl-5.5 break-words [overflow-wrap:anywhere]">
                            {material.tp_desc}
                        </p>
                    </div>
                )}

                {/* 3. Main Content Area */}
                {material.content && (
                    <div className="p-4 sm:p-6 rounded-3xl bg-card border border-border/70 shadow-xs space-y-3 w-full min-w-0 max-w-full overflow-hidden">
                        <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider pb-1 border-b border-border/40">
                            <BookOpen className="h-4 w-4" />
                            <span>Isi Pembelajaran Utama</span>
                        </div>
                        <div className="w-full min-w-0 max-w-full overflow-x-auto">
                            <div
                                className="prose prose-sm sm:prose-base max-w-none text-foreground leading-relaxed break-words [overflow-wrap:anywhere] [word-break:break-word] material-content"
                                dangerouslySetInnerHTML={{ __html: material.content }}
                            />
                        </div>
                    </div>
                )}

                {/* 4. Learning Steps / Jalur Belajar Diferensiasi (Interactive Tabs) */}
                <LearningStepsSection
                    understandingActivity={material.understanding_activity}
                    applicationActivity={material.application_activity}
                    reflectionActivity={material.reflection_activity}
                />

                {/* 5. Resources & Media Section */}
                <MaterialResourcesSection
                    resources={material.resources}
                    mainFilePath={material.file_path}
                    mainFileType={material.file_type}
                    externalLink={material.external_link}
                />

                {/* M6: Teacher Class Progress & Completion Monitoring Card */}
                {isTeacher && class_stats && (
                    <div className="p-4 sm:p-5 rounded-3xl bg-card border border-border/70 shadow-xs space-y-3 fade-in w-full min-w-0 max-w-full">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <BarChart3 className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="text-xs sm:text-sm font-black text-foreground">
                                        Monitoring Penyelesaian Siswa Kelas
                                    </h3>
                                    <p className="text-[11px] text-muted-foreground font-medium">
                                        {class_stats.completed_students} dari {class_stats.total_students} siswa telah menyelesaikan materi ({class_stats.percentage}%)
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowStudentList(!showStudentList)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/70 hover:bg-muted text-foreground font-bold text-xs transition cursor-pointer"
                            >
                                <Users className="h-3.5 w-3.5 text-primary" />
                                <span>{showStudentList ? 'Tutup Daftar Siswa' : 'Lihat Daftar Siswa'}</span>
                                {showStudentList ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-muted/60 rounded-full h-2.5 overflow-hidden">
                            <div
                                className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${Math.min(100, class_stats.percentage)}%` }}
                            />
                        </div>

                        {/* Expandable Student List Breakdown */}
                        {showStudentList && (
                            <div className="space-y-3 pt-2 border-t border-border/40 fade-in">
                                <div className="flex items-center gap-1.5 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setStudentFilter('all')}
                                        className={`px-2.5 py-1 rounded-lg font-bold transition text-xs ${studentFilter === 'all' ? 'bg-primary text-primary-foreground shadow-2xs' : 'bg-muted text-muted-foreground'}`}
                                    >
                                        Semua ({class_stats.total_students})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStudentFilter('completed')}
                                        className={`px-2.5 py-1 rounded-lg font-bold transition text-xs ${studentFilter === 'completed' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-muted text-muted-foreground'}`}
                                    >
                                        Selesai ({class_stats.completed_students})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStudentFilter('pending')}
                                        className={`px-2.5 py-1 rounded-lg font-bold transition text-xs ${studentFilter === 'pending' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-muted text-muted-foreground'}`}
                                    >
                                        Belum ({class_stats.total_students - class_stats.completed_students})
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-72 overflow-y-auto p-1">
                                    {filteredClassStudents.map((s) => (
                                        <div
                                            key={s.id}
                                            className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/50 text-xs"
                                        >
                                            <div className="min-w-0">
                                                <p className="font-bold text-foreground truncate">{s.name}</p>
                                                <p className="text-[10px] text-muted-foreground font-medium">
                                                    NIS {s.nis} • {s.class_name}
                                                </p>
                                            </div>
                                            {s.is_completed ? (
                                                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold border border-emerald-500/20">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Selesai
                                                </span>
                                            ) : (
                                                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-medium border border-border/40">
                                                    <Clock className="h-3 w-3" />
                                                    Belum
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* M1: Student Reflection Form Section */}
                {isStudent && (
                    <div id="refleksi" className="space-y-3 pt-2 scroll-mt-16">
                        <ReflectionForm
                            materialId={material.id}
                            existingReflection={my_reflection}
                        />
                    </div>
                )}

                {/* M2: Teacher Student Reflections Feed Section */}
                {isTeacher && (
                    <div id="refleksi-guru" className="space-y-3 pt-2 scroll-mt-16">
                        <div className="p-4 sm:p-5 rounded-3xl bg-card border border-border/70 shadow-xs space-y-4">
                            <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-border/40">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                                        <Sparkles className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-xs sm:text-sm font-black text-foreground">
                                            Jurnal Refleksi Mandiri Siswa
                                        </h3>
                                        <p className="text-[11px] text-muted-foreground font-medium">
                                            {all_reflections.length} tanggapan refleksi dari siswa
                                        </p>
                                    </div>
                                </div>

                                {all_reflections.length > 0 && (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-black">
                                        <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                                        <span>Rata-rata Pemahaman: {averageUnderstanding} / 5</span>
                                    </div>
                                )}
                            </div>

                            {all_reflections.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground space-y-1">
                                    <Smile className="h-8 w-8 mx-auto text-muted-foreground/50" />
                                    <p className="text-xs font-bold text-foreground/80">Belum Ada Refleksi Siswa</p>
                                    <p className="text-[11px]">Siswa yang menyelesaikan materi dan mengisi jurnal refleksi akan tampil di sini.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {all_reflections.map((r) => (
                                        <div
                                            key={r.id}
                                            className="p-3.5 rounded-2xl bg-muted/30 border border-border/50 space-y-2 text-xs"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {r.student_photo ? (
                                                        <img
                                                            src={r.student_photo}
                                                            alt={r.student_name}
                                                            className="h-7 w-7 rounded-full object-cover shrink-0 border border-border"
                                                        />
                                                    ) : (
                                                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px] shrink-0">
                                                            {r.student_name.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-foreground truncate">{r.student_name}</p>
                                                        <p className="text-[10px] text-muted-foreground">{r.created_at}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-0.5 shrink-0">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star
                                                            key={star}
                                                            className={`h-3.5 w-3.5 ${
                                                                star <= r.understanding_level
                                                                    ? 'fill-amber-400 text-amber-400'
                                                                    : 'text-muted-foreground/30'
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            {r.interesting_thing && (
                                                <div className="p-2 rounded-xl bg-card border border-border/40 text-[11px] space-y-0.5">
                                                    <span className="font-bold text-primary flex items-center gap-1">
                                                        <ThumbsUp className="h-3 w-3" /> Hal Menarik:
                                                    </span>
                                                    <p className="text-foreground/90 leading-relaxed pl-4">{r.interesting_thing}</p>
                                                </div>
                                            )}

                                            {r.difficulty && (
                                                <div className="p-2 rounded-xl bg-card border border-border/40 text-[11px] space-y-0.5">
                                                    <span className="font-bold text-rose-500 flex items-center gap-1">
                                                        <HelpCircle className="h-3 w-3" /> Kendala / Kesulitan:
                                                    </span>
                                                    <p className="text-foreground/90 leading-relaxed pl-4">{r.difficulty}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Student Action Bar (Mark Complete) */}
                {isStudent && (
                    <div className="pt-2 flex justify-center">
                        {is_completed ? (
                            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold text-sm shadow-xs">
                                <CheckCircle2 className="h-5 w-5" />
                                <span>Materi Ini Sudah Anda Selesaikan</span>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={handleMarkComplete}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-primary text-primary-foreground font-extrabold text-sm shadow-md hover:bg-primary/90 transition active:scale-95 min-h-[48px] w-full sm:w-auto cursor-pointer"
                            >
                                <CheckCircle2 className="h-5 w-5" />
                                <span>Tandai Selesai Mempelajari</span>
                            </button>
                        )}
                    </div>
                )}

                {/* Comment & Discussion Section */}
                <div id="diskusi" className="pt-4 border-t border-border/50 scroll-mt-16">
                    <CommentSection
                        materialId={material.id}
                        comments={comments}
                        authId={auth_id}
                        userRole={user_role}
                    />
                </div>
            </div>

            {/* Immersive Focus Mode Fullscreen Overlay */}
            {isFocusMode && (
                <div className="fixed inset-0 z-50 bg-background overflow-y-auto fade-in">
                    {/* Sticky Focus Mode Top Bar */}
                    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/80 px-4 sm:px-8 py-3 shadow-2xs">
                        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <button
                                    type="button"
                                    onClick={() => setIsFocusMode(false)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs transition active:scale-95 min-h-[38px] cursor-pointer shrink-0"
                                    title="Keluar dari Mode Fokus (Esc)"
                                >
                                    <Minimize2 className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Keluar Fokus</span>
                                    <kbd className="hidden md:inline px-1 py-0.2 text-[9px] bg-background rounded border text-muted-foreground">Esc</kbd>
                                </button>
                                <div className="min-w-0">
                                    <h2 className="text-xs sm:text-sm font-bold text-foreground truncate">{material.title}</h2>
                                    <p className="text-[10px] text-muted-foreground font-medium truncate">{material.subject_name}</p>
                                </div>
                            </div>

                            {/* Controls: Font Size Scaling + Complete CTA */}
                            <div className="flex items-center gap-2 shrink-0">
                                <div className="hidden sm:flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/50 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setFocusFontSize('normal')}
                                        className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${focusFontSize === 'normal' ? 'bg-card text-primary shadow-2xs' : 'text-muted-foreground'}`}
                                        title="Ukuran Font Normal"
                                    >
                                        A
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFocusFontSize('large')}
                                        className={`px-2.5 py-1 rounded-lg font-bold transition text-sm cursor-pointer ${focusFontSize === 'large' ? 'bg-card text-primary shadow-2xs' : 'text-muted-foreground'}`}
                                        title="Ukuran Font Besar"
                                    >
                                        A+
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFocusFontSize('xlarge')}
                                        className={`px-2.5 py-1 rounded-lg font-bold transition text-base cursor-pointer ${focusFontSize === 'xlarge' ? 'bg-card text-primary shadow-2xs' : 'text-muted-foreground'}`}
                                        title="Ukuran Font Ekstra Besar"
                                    >
                                        A++
                                    </button>
                                </div>

                                {isStudent && (
                                    is_completed ? (
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            <span className="hidden xs:inline">Selesai</span>
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleMarkComplete}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xs hover:bg-primary/90 transition active:scale-95 min-h-[38px] cursor-pointer"
                                        >
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            <span>Tandai Selesai</span>
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Reading Content Canvas */}
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8 w-full min-w-0 max-w-full">
                        {/* Goal TP */}
                        {material.tp_desc && (
                            <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 border border-amber-500/25 space-y-1.5 w-full min-w-0 max-w-full overflow-hidden">
                                <div className="flex items-center gap-2 text-xs font-bold text-amber-700">
                                    <Sparkles className="h-4 w-4 text-amber-600" />
                                    <span>Tujuan Pembelajaran {material.tp_code ? `(TP: ${material.tp_code})` : ''}</span>
                                </div>
                                <p className="text-sm sm:text-base text-foreground/90 font-medium leading-relaxed pl-6 break-words [overflow-wrap:anywhere]">
                                    {material.tp_desc}
                                </p>
                            </div>
                        )}

                        {/* Main Reading Content */}
                        {material.content && (
                            <div className="p-4 sm:p-8 rounded-3xl bg-card border border-border/70 shadow-xs space-y-4 w-full min-w-0 max-w-full overflow-hidden">
                                <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider pb-2 border-b border-border/40">
                                    <BookOpen className="h-4 w-4" />
                                    <span>Isi Pembelajaran</span>
                                </div>
                                <div className="w-full min-w-0 max-w-full overflow-x-auto">
                                    <div
                                        className={`prose max-w-none text-foreground ${proseFontSizeClass} break-words [overflow-wrap:anywhere] [word-break:break-word] material-content`}
                                        dangerouslySetInnerHTML={{ __html: material.content }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Learning Steps */}
                        <LearningStepsSection
                            understandingActivity={material.understanding_activity}
                            applicationActivity={material.application_activity}
                            reflectionActivity={material.reflection_activity}
                        />

                        {/* Resources & Media (embedded players, images, links) */}
                        <MaterialResourcesSection
                            resources={material.resources}
                            mainFilePath={material.file_path}
                            mainFileType={material.file_type}
                            externalLink={material.external_link}
                        />

                        {/* Student Reflection in Focus Mode */}
                        {isStudent && (
                            <div className="pt-2">
                                <ReflectionForm
                                    materialId={material.id}
                                    existingReflection={my_reflection}
                                />
                            </div>
                        )}

                        {/* Bottom Focus Mode Actions */}
                        <div className="pt-6 pb-12 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/60">
                            <button
                                type="button"
                                onClick={() => setIsFocusMode(false)}
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs transition active:scale-95 min-h-[46px] w-full sm:w-auto justify-center cursor-pointer"
                            >
                                <Minimize2 className="h-4 w-4" />
                                <span>Keluar dari Mode Fokus</span>
                            </button>

                            {isStudent && (
                                is_completed ? (
                                    <div className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold text-xs">
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span>Materi Ini Sudah Selesai</span>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleMarkComplete}
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-extrabold text-xs shadow-md hover:bg-primary/90 transition active:scale-95 min-h-[46px] w-full sm:w-auto justify-center cursor-pointer"
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span>Tandai Selesai Mempelajari</span>
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                open={isDeleting}
                onOpenChange={setIsDeleting}
                onConfirm={handleDeleteConfirm}
                title="Hapus Materi"
                message="Apakah Anda yakin ingin menghapus materi pembelajaran ini? Seluruh berkas dan komentar terkait akan dihapus secara permanen."
                confirmLabel="Hapus"
                cancelLabel="Batal"
                variant="destructive"
            />
        </AppLayout>
    );
}
