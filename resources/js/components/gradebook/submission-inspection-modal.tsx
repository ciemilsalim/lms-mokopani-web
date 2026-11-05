import React from 'react';
import { 
    X, 
    ExternalLink, 
    CheckCircle2, 
    AlertCircle, 
    Clock, 
    FileText, 
    MessageSquare, 
    SlidersHorizontal,
    Award,
    RotateCcw
} from 'lucide-react';
import { router } from '@inertiajs/react';

export interface InspectionData {
    studentId: number;
    studentName: string;
    studentNis?: string;
    assignmentId?: number | null;
    submissionId?: number | null;
    title: string;
    tpCode?: string;
    type?: string;
    score: number | string;
    kktp?: number;
    submittedAt?: string | null;
    feedback?: string | null;
    filePath?: string | null;
    hasContent?: boolean;
    isRemedialOpen?: boolean;
    classId?: number | string;
}

interface SubmissionInspectionModalProps {
    data: InspectionData | null;
    onClose: () => void;
    onOpenRemedial?: (assignmentId: number, studentId: number) => void;
}

export function SubmissionInspectionModal({
    data,
    onClose,
    onOpenRemedial
}: SubmissionInspectionModalProps) {
    if (!data) return null;

    const hasScore = data.score !== '-' && data.score !== null && data.score !== undefined;
    const numScore = hasScore ? Number(data.score) : null;
    const isFormative = data.type?.toLowerCase().includes('formatif');
    const kktpThreshold = isFormative ? 80 : (data.kktp ?? 75);
    const isPassed = numScore !== null ? numScore >= kktpThreshold : null;

    const handleGoToGrading = () => {
        if (!data.assignmentId) return;
        const url = route('assignments.grade-view', {
            assignment: data.assignmentId,
            student_id: data.studentId,
            class_id: data.classId,
        });
        router.visit(url);
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 p-1.5 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Header */}
                <div className="space-y-1 pr-6">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                            {data.tpCode || data.type || 'Asesmen'}
                        </span>
                        {isPassed !== null && (
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                                isPassed 
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                            }`}>
                                {isPassed ? '✓ Tuntas' : '⚠️ Perlu Remedial'}
                            </span>
                        )}
                    </div>
                    <h2 className="text-base sm:text-lg font-black text-foreground leading-snug">
                        {data.title}
                    </h2>
                    <p className="text-xs text-muted-foreground font-medium">
                        Siswa: <strong className="text-foreground">{data.studentName}</strong> {data.studentNis ? `(NIS: ${data.studentNis})` : ''}
                    </p>
                </div>

                {/* Score & Evaluation Card */}
                <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-xl bg-muted/30 border border-border/80 text-xs">
                    <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Nilai Tercatat</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-2xl font-black text-foreground">
                                {hasScore ? data.score : '—'}
                            </span>
                            <span className="text-xs font-bold text-muted-foreground">/ 100</span>
                        </div>
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Standar KKTP</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-2xl font-black text-primary">
                                {kktpThreshold}
                            </span>
                            <span className="text-xs text-muted-foreground">Minimal</span>
                        </div>
                    </div>
                </div>

                {/* Submission Details */}
                <div className="rounded-xl border border-border/70 bg-card divide-y divide-border/60 text-xs">
                    <div className="p-3 flex items-center justify-between">
                        <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>Waktu Pengumpulan</span>
                        </span>
                        <span className="font-bold text-foreground">
                            {data.submittedAt || (hasScore ? 'Dinilai Langsung oleh Guru' : 'Belum Mengumpulkan')}
                        </span>
                    </div>

                    {data.filePath && (
                        <div className="p-3 flex items-center justify-between">
                            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5 text-primary" />
                                <span>Berkas / Bukti Fisik</span>
                            </span>
                            <a
                                href={data.filePath.startsWith('http') ? data.filePath : `/storage/${data.filePath}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline font-bold"
                            >
                                <span>Lihat Berkas</span>
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>
                    )}

                    <div className="p-3 space-y-1">
                        <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                            <MessageSquare className="h-3.5 w-3.5 text-primary" />
                            <span>Catatan & Umpan Balik Guru</span>
                        </span>
                        <p className="text-foreground leading-relaxed italic bg-muted/20 p-2.5 rounded-lg border border-border/50">
                            {data.feedback ? data.feedback : 'Belum ada catatan umpan balik khusus dari guru.'}
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-border/60">
                    {data.assignmentId && isPassed === false && onOpenRemedial && !data.isRemedialOpen && (
                        <button
                            type="button"
                            onClick={() => onOpenRemedial(data.assignmentId!, data.studentId)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition cursor-pointer min-h-[40px]"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Buka Remedial</span>
                        </button>
                    )}

                    <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted transition cursor-pointer min-h-[40px]"
                        >
                            Tutup
                        </button>
                        {data.assignmentId && (
                            <button
                                type="button"
                                onClick={handleGoToGrading}
                                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition cursor-pointer min-h-[40px]"
                            >
                                <SlidersHorizontal className="h-3.5 w-3.5" />
                                <span>Buka Lembar Penilaian</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

