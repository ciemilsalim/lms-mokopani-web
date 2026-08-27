import React from 'react';
import { BookOpen, GraduationCap, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ReportHeaderProps {
    subjectName: string;
    classNameStr: string;
    teacherName: string;
    periodStr: string;
    schoolName?: string;
    schoolAddress?: string;
    className?: string;
}

export function ReportHeader({
    subjectName,
    classNameStr,
    teacherName,
    periodStr,
    schoolName,
    schoolAddress,
    className = '',
}: ReportHeaderProps) {
    return (
        <div className={cn('rounded-3xl border border-border/70 bg-card p-5 sm:p-6 shadow-xs space-y-4', className)}>
            {schoolName && (
                <div className="text-center pb-3 border-b border-border/60">
                    <h1 className="text-base sm:text-lg font-black uppercase tracking-wider text-foreground">{schoolName}</h1>
                    {schoolAddress && <p className="text-xs text-muted-foreground mt-0.5">{schoolAddress}</p>}
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                        <BookOpen className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-base sm:text-lg font-black text-foreground">{subjectName}</h2>
                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5">
                            <GraduationCap className="h-3.5 w-3.5 text-primary" />
                            <span>Kelas {classNameStr}</span>
                            <span className="text-border">•</span>
                            <span>{periodStr}</span>
                        </p>
                    </div>
                </div>

                <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-right sm:text-left self-start sm:self-auto">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-primary" />
                        <span>Guru Pengampu</span>
                    </p>
                    <p className="text-xs font-bold text-foreground mt-0.5">{teacherName}</p>
                </div>
            </div>
        </div>
    );
}
