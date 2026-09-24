import React, { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    BookOpen, CheckCircle2, FileText, Sparkles, MessageSquare, Download,
    ExternalLink, Trash2, Edit, User, Calendar, Lock, Unlock, ChevronLeft,
    Maximize2, Minimize2, ZoomIn, ZoomOut, X
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

interface ShowMaterialProps {
    material: Material;
    comments?: any[];
    my_reflection?: any;
    all_reflections?: any[];
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

    const isTeacher = user_role === 'teacher' || user_role === 'admin';
    const isStudent = user_role === 'student';

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

    const breadcrumbs: BreadcrumbItem[] = class_id ? [
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

                {/* Quick Reading Actions & Focus Mode Trigger */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-card border border-border/70 shadow-2xs">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsFocusMode(true)}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground font-bold text-xs transition active:scale-95 min-h-[40px] cursor-pointer shadow-2xs"
                            title="Buka Mode Membaca Fokus (Bebas Gangguan)"
                        >
                            <Maximize2 className="h-4 w-4" />
                            <span>Mode Fokus Membaca</span>
                        </button>

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
