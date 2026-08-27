import React from 'react';
import { Link } from '@inertiajs/react';
import { Users, BookOpen, ChevronRight, GraduationCap, Library, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface ClassItemProps {
    id: number;
    name: string;
    students_count: number;
    subjects: string[];
    materials_count?: number;
    assignments_count?: number;
}

interface ClassCardProps {
    classItem: ClassItemProps;
}

export function ClassCard({ classItem }: ClassCardProps) {
    const subjectsText = classItem.subjects && classItem.subjects.length > 0
        ? classItem.subjects.join(', ')
        : 'Mata Pelajaran Umum';

    return (
        <Link
            href={`/classes/${classItem.id}`}
            className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-card border border-border/70 hover:border-primary/40 shadow-2xs hover:shadow-md transition-all active:scale-[0.98] min-h-[140px]"
        >
            <div>
                {/* Top Row: Class Badge & Arrow */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <GraduationCap className="h-4 w-4" />
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-foreground group-hover:text-primary transition-colors truncate">
                            {classItem.name}
                        </h3>
                    </div>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted/50 group-hover:bg-primary/15 group-hover:text-primary transition-colors">
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                    </div>
                </div>

                {/* Subtitle / Subjects Taught */}
                <p className="text-xs text-muted-foreground truncate mb-3 font-medium">
                    {subjectsText}
                </p>
            </div>

            {/* Bottom Row: Stats Pills */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/40 text-xs font-semibold text-muted-foreground">
                <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-lg">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span className="text-foreground font-bold">{classItem.students_count}</span>
                    <span className="text-[11px]">Siswa</span>
                </div>

                {typeof classItem.materials_count === 'number' && (
                    <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-lg">
                        <Library className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-foreground font-bold">{classItem.materials_count}</span>
                        <span className="text-[11px]">Materi</span>
                    </div>
                )}

                {typeof classItem.assignments_count === 'number' && (
                    <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-lg">
                        <ClipboardList className="h-3.5 w-3.5 text-rose-500" />
                        <span className="text-foreground font-bold">{classItem.assignments_count}</span>
                        <span className="text-[11px]">Asesmen</span>
                    </div>
                )}
            </div>
        </Link>
    );
}
