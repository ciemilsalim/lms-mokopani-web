import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    ChevronLeft, Clock, Award, Users, BookOpen, Pencil, Trash2, Calendar
} from 'lucide-react';
import { AssessmentTypeBadge } from './assessment-status-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface SchoolClass {
    id: number;
    name: string;
}

interface AssessmentDetailHeaderProps {
    id: number;
    title: string;
    subjectName?: string;
    schoolClasses?: SchoolClass[];
    dueDate?: string | null;
    maxPoints?: number;
    passingGrade?: number | null;
    assessmentType?: string | null;
    isTeacher?: boolean;
    onDelete?: () => void;
    className?: string;
}

export function AssessmentDetailHeader({
    id,
    title,
    subjectName,
    schoolClasses = [],
    dueDate,
    maxPoints = 100,
    passingGrade,
    assessmentType,
    isTeacher = false,
    onDelete,
    className = '',
}: AssessmentDetailHeaderProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleBack = () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            router.visit(route('assignments.index'));
        }
    };

    const handleEdit = () => {
        router.get(route('assignments.edit', id));
    };

    const handleDeleteConfirm = () => {
        if (onDelete) {
            onDelete();
        } else {
            router.delete(route('assignments.destroy', id));
        }
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Contextual Back Navigation & Action Controls */}
            <div className="flex items-center justify-between gap-2">
                <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition min-h-[44px] -ml-1 px-1.5 rounded-xl hover:bg-muted/50"
                >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Kembali</span>
                </button>

                {isTeacher && (
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={handleEdit}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-foreground bg-card border border-border rounded-xl hover:bg-muted/60 transition min-h-[40px]"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-destructive bg-destructive/10 border border-destructive/20 rounded-xl hover:bg-destructive/20 transition min-h-[40px]"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Hapus</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Title & Metadata Header Card */}
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-3.5 shadow-xs">
                <div className="flex flex-wrap items-center gap-2">
                    <AssessmentTypeBadge type={assessmentType} />
                    {subjectName && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary/10 text-primary text-[11px] font-bold">
                            <BookOpen className="h-3 w-3" />
                            {subjectName}
                        </span>
                    )}
                    {schoolClasses.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-muted text-muted-foreground text-[11px] font-bold">
                            <Users className="h-3 w-3" />
                            {schoolClasses.map(c => c.name).join(', ')}
                        </span>
                    )}
                </div>

                <h1 className="text-lg sm:text-2xl font-black text-foreground leading-snug">
                    {title}
                </h1>

                {/* Key Details Grid */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-xs text-muted-foreground border-t border-border/50">
                    <div className="flex items-center gap-1.5 pt-2">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        <span>Tenggat: <strong className="text-foreground">{dueDate || 'Tidak ada batas'}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 pt-2">
                        <Award className="h-3.5 w-3.5 text-primary" />
                        <span>Maksimal: <strong className="text-foreground">{maxPoints} Poin</strong></span>
                    </div>
                    {passingGrade !== null && passingGrade !== undefined && (
                        <div className="flex items-center gap-1.5 pt-2">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            <span>KKTP: <strong className="text-foreground">{passingGrade} Poin</strong></span>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmDialog
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                title="Hapus Asesmen"
                message="Peringatan! Menghapus asesmen ini akan MENGHAPUS SEMUA data pengumpulan siswa dan nilai terkait secara permanen."
                onConfirm={handleDeleteConfirm}
                requireInput="DELETE"
                inputPlaceholder="Ketik DELETE untuk konfirmasi"
            />
        </div>
    );
}
