import React from 'react';
import { router } from '@inertiajs/react';
import { Users, CheckCircle2, Clock, Award, ChevronRight, FileText } from 'lucide-react';

interface Submission {
    id: number;
    student_id: number;
    student_name: string;
    score: number | null;
    submitted_at: string;
}

interface TeacherOverviewProps {
    assignmentId: number;
    submissions: Submission[];
    studentsCount?: number;
    maxPoints?: number;
    className?: string;
}

export function AssessmentDetailTeacherOverview({
    assignmentId,
    submissions = [],
    studentsCount = 0,
    maxPoints = 100,
    className = '',
}: TeacherOverviewProps) {
    const totalSubmitted = submissions.length;
    const gradedSubmissions = submissions.filter(s => s.score !== null);
    const pendingGradingCount = submissions.filter(s => s.score === null).length;

    const handleGoToGrading = () => {
        router.visit(route('assignments.grade-view', assignmentId));
    };

    return (
        <div className={`rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-4 shadow-xs ${className}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Users className="h-4 w-4" />
                    </div>
                    <h2 className="text-sm font-bold text-foreground">Ringkasan Pengumpulan Siswa</h2>
                </div>

                <button
                    type="button"
                    onClick={handleGoToGrading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-primary-foreground bg-primary rounded-xl shadow-xs hover:bg-primary/90 transition min-h-[40px] active:scale-[0.98]"
                >
                    <span>Penilaian Siswa</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div className="rounded-xl border border-border bg-muted/20 p-3 text-center">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Total Dikumpulkan</p>
                    <p className="text-base sm:text-lg font-black text-foreground mt-0.5">{totalSubmitted}</p>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                    <p className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Sudah Dinilai</p>
                    <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{gradedSubmissions.length}</p>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
                    <p className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">Perlu Dinilai</p>
                    <p className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">{pendingGradingCount}</p>
                </div>
            </div>
        </div>
    );
}
