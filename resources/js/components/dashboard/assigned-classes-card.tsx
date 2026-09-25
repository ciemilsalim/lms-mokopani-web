import React from 'react';
import { School, ChevronRight, Users, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from '@inertiajs/react';

export interface AssignedClassData {
    id: number;
    name: string;
    student_count?: number;
    subjects?: string[];
}

export interface AssignedClassesCardProps {
    classes?: AssignedClassData[];
    className?: string;
}

/**
 * AssignedClassesCard (Kelas yang Diampu)
 * Displays the list of classes actively taught by the teacher with direct links to class hub and gradebook.
 */
export function AssignedClassesCard({ classes = [], className = '' }: AssignedClassesCardProps) {
    if (!classes || classes.length === 0) {
        return null;
    }

    return (
        <Card className={`rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden w-full min-w-0 ${className}`}>
            <div className="p-3.5 sm:p-4 border-b border-border/60 bg-muted/20 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                    <h2 className="text-base font-bold text-foreground leading-tight flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400">
                            <School className="h-4 w-4" />
                        </div>
                        <span className="truncate">Kelas yang Diampu</span>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate pl-10">
                        {classes.length} rombel kelas aktif semester ini
                    </p>
                </div>
                <Link
                    href="/classes"
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5 min-h-[44px] px-2 py-1 shrink-0"
                >
                    <span>Semua Kelas</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                </Link>
            </div>

            <CardContent className="p-3.5 sm:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {classes.map((cls) => (
                        <div
                            key={cls.id}
                            className="p-3 rounded-xl border border-border/60 bg-muted/10 hover:bg-muted/30 transition-all flex flex-col justify-between gap-3"
                        >
                            <div className="min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="text-sm font-bold text-foreground truncate">
                                        {cls.name}
                                    </h3>
                                    {cls.student_count !== undefined && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground shrink-0">
                                            <Users className="h-2.5 w-2.5" />
                                            {cls.student_count} Siswa
                                        </span>
                                    )}
                                </div>
                                {cls.subjects && cls.subjects.length > 0 && (
                                    <p className="text-[11px] text-muted-foreground truncate mt-1 flex items-center gap-1">
                                        <BookOpen className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                                        <span>{cls.subjects.join(', ')}</span>
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-1.5 pt-1 border-t border-border/40">
                                <Link
                                    href={`/classes/${cls.id}`}
                                    className="flex-1 py-1.5 px-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold text-center transition-colors"
                                >
                                    Buka Kelas
                                </Link>
                                <Link
                                    href={`/gradebook?class_id=${cls.id}`}
                                    className="py-1.5 px-2.5 rounded-lg border border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground text-[11px] font-bold text-center transition-colors shrink-0"
                                >
                                    Nilai
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
