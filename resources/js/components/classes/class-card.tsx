import React from 'react';
import { Link } from '@inertiajs/react';
import { ChevronRight, GraduationCap, Library, ClipboardList, AlertCircle } from 'lucide-react';

export interface ClassItemProps {
    id: number;
    name: string;
    students_count: number;
    subjects: string[];
    materials_count?: number;
    assignments_count?: number;
    pending_tasks_count?: number;
}

interface ClassCardProps {
    classItem: ClassItemProps;
}

export function ClassCard({ classItem }: ClassCardProps) {
    const subjectsText = classItem.subjects && classItem.subjects.length > 0
        ? classItem.subjects.join(', ')
        : 'Informatika';

    const hasNoStudents = classItem.students_count === 0;

    return (
        <Link
            href={`/classes/${classItem.id}`}
            className="group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl bg-card border border-border/70 hover:border-primary/50 shadow-2xs hover:shadow-md transition-all active:scale-[0.98] min-h-[92px] w-full min-w-0"
        >
            <div>
                {/* Header Row: Class Icon + Name + Chevron */}
                <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors shadow-2xs">
                            <GraduationCap className="h-4 w-4" />
                        </div>
                        <h3 className="text-sm sm:text-base font-black text-foreground group-hover:text-primary transition-colors truncate">
                            {classItem.name}
                        </h3>
                    </div>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/40 group-hover:bg-primary/15 group-hover:text-primary transition-colors">
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                    </div>
                </div>

                {/* Subtitle: Subject • Students Count */}
                <p className="text-xs text-muted-foreground truncate font-medium pl-10">
                    <span>{subjectsText}</span>
                    <span className="mx-1.5 opacity-40">•</span>
                    <span className="font-bold text-foreground/85">{classItem.students_count} Siswa</span>
                </p>
            </div>

            {/* Bottom Status / Counters */}
            <div className="flex items-center gap-2 pt-2.5 mt-2 border-t border-border/40 text-[11px] font-semibold text-muted-foreground pl-10">
                {hasNoStudents ? (
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[11px] font-bold">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>Belum ada siswa terdaftar</span>
                    </span>
                ) : (
                    <>
                        {typeof classItem.materials_count === 'number' && (
                            <span className="inline-flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded-md">
                                <Library className="h-3 w-3 text-amber-500 shrink-0" />
                                <span className="font-bold text-foreground">{classItem.materials_count}</span>
                                <span>Materi</span>
                            </span>
                        )}

                        {typeof classItem.assignments_count === 'number' && (
                            <span className="inline-flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded-md">
                                <ClipboardList className="h-3 w-3 text-rose-500 shrink-0" />
                                <span className="font-bold text-foreground">{classItem.assignments_count}</span>
                                <span>Asesmen</span>
                            </span>
                        )}
                    </>
                )}
            </div>
        </Link>
    );
}
