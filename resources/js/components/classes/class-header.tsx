import React from 'react';
import { GraduationCap, Users, BookOpen } from 'lucide-react';

interface ClassHeaderProps {
    className: string;
    subjects?: string[];
    studentsCount: number;
    backUrl?: string;
}

export function ClassHeader({ className, subjects = [], studentsCount }: ClassHeaderProps) {
    const subjectsText = subjects.length > 0 ? subjects.join(', ') : 'Informatika';
    // Clean redundant "Kelas Kelas" prefix
    const cleanClassName = className.replace(/^Kelas\s+Kelas\s*/i, 'Kelas ').replace(/^Kelas\s*(\d)/i, 'Kelas $1');

    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-card p-4 sm:p-5 border border-primary/20 shadow-xs w-full min-w-0">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-black shadow-xs">
                    <GraduationCap className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <h1 className="text-lg sm:text-xl font-black text-foreground tracking-tight truncate">
                        {cleanClassName}
                    </h1>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-0.5 text-xs text-muted-foreground font-medium">
                        <span className="font-bold text-foreground/90">{subjectsText}</span>
                        <span className="text-muted-foreground/40">•</span>
                        <span>{studentsCount} Siswa Terdaftar</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
