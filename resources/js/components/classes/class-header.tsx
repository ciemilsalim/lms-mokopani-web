import React from 'react';
import { Link } from '@inertiajs/react';
import { ArrowLeft, GraduationCap, Users, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ClassHeaderProps {
    className: string;
    subjects?: string[];
    studentsCount: number;
    backUrl?: string;
}

export function ClassHeader({ className, subjects = [], studentsCount, backUrl = '/classes' }: ClassHeaderProps) {
    const subjectsText = subjects.length > 0 ? subjects.join(', ') : 'Mata Pelajaran Umum';

    return (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/15 via-primary/5 to-card p-5 sm:p-6 border border-primary/20 shadow-xs">
            {/* Contextual Back Navigation */}
            <div className="flex items-center justify-between gap-3 mb-3">
                <Link
                    href={backUrl}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-background/80 hover:bg-background border border-border/60 text-xs font-bold text-foreground transition active:scale-95 min-h-[44px]"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Kembali</span>
                </Link>

                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs font-black px-3 py-1 rounded-xl">
                    Detail Kelas
                </Badge>
            </div>

            {/* Title & Metadata */}
            <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-black shadow-xs">
                        <GraduationCap className="h-5 w-5" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                        {className}
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground font-medium">
                    <span className="flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                        <span className="font-bold text-foreground">{subjectsText}</span>
                    </span>
                    <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        <span className="font-bold text-foreground">{studentsCount}</span> Siswa Terdaftar
                    </span>
                </div>
            </div>
        </div>
    );
}
