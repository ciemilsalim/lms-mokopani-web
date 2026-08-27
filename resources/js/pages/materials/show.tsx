import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    BookOpen, CheckCircle2, FileText, Sparkles, MessageSquare, Download,
    ExternalLink, Trash2, Edit, User, Calendar, Lock, Unlock, ChevronLeft
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
}: ShowMaterialProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    const isTeacher = user_role === 'teacher' || user_role === 'admin';
    const isStudent = user_role === 'student';

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Bahan Materi', href: '/materials' },
        { title: material.title, href: `/materials/${material.id}` },
    ];

    const handleMarkComplete = () => {
        router.post(route('materials.complete', material.id), {}, { preserveScroll: true });
    };

    const handleDeleteConfirm = () => {
        router.delete(route('materials.destroy', material.id));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${material.title} - LMS Mokopani`} />

            <div className="space-y-4 sm:space-y-5 fade-in pb-16 md:pb-6 max-w-4xl mx-auto w-full min-w-0">
                {/* 1. Contextual Header Banner */}
                <MaterialDetailHeader
                    id={material.id}
                    title={material.title}
                    subjectName={material.subject_name}
                    className={material.school_class_name}
                    tpCode={material.tp_code}
                    tpDesc={material.tp_desc}
                    teacherName={material.teacher_name}
                    createdAt={material.created_at}
                    commentsCount={comments.length}
                    accessStatus={material.access_status}
                    isTeacher={isTeacher}
                    onDelete={() => setIsDeleting(true)}
                    backUrl="/materials"
                />

                {/* 2. Tujuan Pembelajaran (Explicit Goal Card) */}
                {material.tp_desc && (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-foreground space-y-1 fade-in">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                            <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            <span>Tujuan Pembelajaran {material.tp_code ? `(TP: ${material.tp_code})` : ''}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed pl-5.5">
                            {material.tp_desc}
                        </p>
                    </div>
                )}

                {/* 3. Main Content Area */}
                {material.content && (
                    <div className="p-4 sm:p-6 rounded-3xl bg-card border border-border/70 shadow-xs space-y-3 w-full min-w-0">
                        <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider pb-1 border-b border-border/40">
                            <BookOpen className="h-4 w-4" />
                            <span>Isi Pembelajaran Utama</span>
                        </div>
                        <div
                            className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-foreground leading-relaxed overflow-x-auto"
                            dangerouslySetInnerHTML={{ __html: material.content }}
                        />
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
                                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-primary text-primary-foreground font-extrabold text-sm shadow-md hover:bg-primary/90 transition active:scale-95 min-h-[48px] w-full sm:w-auto"
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
