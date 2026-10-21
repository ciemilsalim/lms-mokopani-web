import React from 'react';
import { Link } from '@inertiajs/react';
import { ClipboardCheck, CheckCircle2, ChevronRight, UserCheck, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface PendingStudentItem {
    submission_id: number;
    student_id: number;
    student_name: string;
    nis?: string;
    class_id?: number;
    class_name?: string;
    submitted_at?: string;
    grade_url: string;
}

export interface PendingTaskItem {
    id: number;
    title: string;
    class?: string;
    subject?: string;
    pending_count: number;
    due_date?: string;
    first_ungraded_url?: string;
    pending_students?: PendingStudentItem[];
}

export interface PendingTaskListProps {
    items: PendingTaskItem[];
    actionHref?: string;
    className?: string;
}

/**
 * PendingTaskList (Perlu Tindakan)
 * Positioned right after Agenda.
 * Min-height 76px, padding 12-16px, status icon 40x40px, title 14px/700, desc 11-12px.
 * If 0 pending: "✓ Semua tugas sudah dinilai" in a neat compact card.
 * Menampilkan langsung daftar siswa yang belum dinilai dengan tautan penilaian instan.
 */
export function PendingTaskList({
    items = [],
    actionHref = '/assignments',
    className = '',
}: PendingTaskListProps) {
    const totalPending = items.reduce((acc, it) => acc + (it.pending_count || 1), 0);

    return (
        <Card className={`rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden w-full min-w-0 min-h-[76px] ${className}`}>
            <div className="p-3 sm:p-4 border-b border-border/60 bg-muted/20 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-bold text-foreground leading-tight flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                            <ClipboardCheck className="h-4 w-4" />
                        </div>
                        <span className="truncate">Perlu Tindakan</span>
                        {items.length > 0 && (
                            <span className="inline-flex items-center rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 px-2 py-0.5 text-[10px] font-bold">
                                {totalPending}
                            </span>
                        )}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate pl-9">
                        Asesmen siswa yang belum dinilai guru
                    </p>
                </div>

                <Link
                    href={actionHref}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5 min-h-[44px] px-2 py-1 shrink-0"
                >
                    <span>Semua</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                </Link>
            </div>

            <CardContent className="p-0">
                {items.length === 0 ? (
                    <div className="p-3.5 sm:p-4 flex items-center gap-3 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 min-h-[56px]">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-foreground leading-tight">✓ Semua tugas sudah dinilai</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Tidak ada penugasan tertunda saat ini.</p>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-border/50 w-full min-w-0">
                        {items.slice(0, 3).map((task) => {
                            const gradeTargetUrl = task.first_ungraded_url || `/assignments/${task.id}/grade-view`;
                            const studentsList = task.pending_students || [];

                            return (
                                <div
                                    key={task.id}
                                    className="p-3 sm:p-3.5 hover:bg-muted/30 transition-colors w-full min-w-0 space-y-2.5"
                                >
                                    <div className="flex items-start justify-between gap-2.5 min-w-0 w-full">
                                        <Link
                                            href={gradeTargetUrl}
                                            className="group flex items-start gap-3 min-w-0 flex-1"
                                            title="Buka lembar penilaian langsung ke siswa yang belum dinilai"
                                        >
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 mt-0.5">
                                                <ClipboardCheck className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                                    {task.title}
                                                </h3>
                                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                    {task.class ? `${task.class} • ` : ''}{task.subject || 'Mata Pelajaran'}
                                                </p>
                                            </div>
                                        </Link>

                                        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                                            <Link href={gradeTargetUrl}>
                                                <Badge
                                                    variant="destructive"
                                                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0 hover:opacity-90 cursor-pointer"
                                                >
                                                    {task.pending_count} Perlu Dinilai
                                                </Badge>
                                            </Link>
                                            <Link
                                                href={gradeTargetUrl}
                                                className="p-1 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors shrink-0"
                                                title="Buka penilaian"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Link>
                                        </div>
                                    </div>

                                    {/* Direct Pending Student List */}
                                    {studentsList.length > 0 && (
                                        <div className="pl-0 sm:pl-13 pt-1 border-t border-border/40 space-y-1.5">
                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                                                <UserCheck className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                                <span>Data Siswa Belum Dinilai:</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {studentsList.slice(0, 4).map((student) => (
                                                    <Link
                                                        key={student.student_id}
                                                        href={student.grade_url}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 border border-rose-200/60 dark:border-rose-900/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 hover:border-rose-300 dark:hover:border-rose-800 transition active:scale-95 group/pill shadow-2xs"
                                                        title={`Klik untuk menilai jawaban ${student.student_name} (${student.class_name || ''})`}
                                                    >
                                                        <span className="font-bold">{student.student_name}</span>
                                                        {student.class_name && (
                                                            <span className="text-[10px] text-muted-foreground font-normal">
                                                                • {student.class_name}
                                                            </span>
                                                        )}
                                                        <ArrowRight className="h-3 w-3 text-rose-600 dark:text-rose-400 group-hover/pill:translate-x-0.5 transition-transform shrink-0" />
                                                    </Link>
                                                ))}

                                                {studentsList.length > 4 && (
                                                    <Link
                                                        href={gradeTargetUrl}
                                                        className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-bold text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted border border-border/60 transition"
                                                    >
                                                        +{studentsList.length - 4} lainnya
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
