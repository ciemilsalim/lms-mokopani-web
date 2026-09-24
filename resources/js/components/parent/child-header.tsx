import React from 'react';
import { ArrowLeft, GraduationCap, Users } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';

export interface ChildHeaderProps {
    studentName: string;
    studentNis?: string;
    classNameStr?: string;
    periodStr?: string;
    backHref?: string;
    className?: string;
}

export function ChildHeader({
    studentName,
    studentNis,
    classNameStr,
    periodStr,
    backHref = '/parent/dashboard',
    className = '',
}: ChildHeaderProps) {
    return (
        <div className={cn('space-y-3', className)}>
            <Link
                href={backHref}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition active:scale-95 min-h-[44px]"
            >
                <ArrowLeft className="h-4 w-4" />
                <span>Kembali ke Dashboard Orang Tua</span>
            </Link>

            <div className="rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-indigo-600 p-5 sm:p-6 text-white shadow-md">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md font-black text-lg text-white shrink-0">
                        {studentName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-lg sm:text-xl font-black text-white truncate">{studentName}</h1>
                        <p className="text-xs text-white/80 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                            <GraduationCap className="h-3.5 w-3.5 text-white shrink-0" />
                            <span className="truncate">Kelas {classNameStr || '-'}</span>
                            <span className="text-white/40">•</span>
                            <span className="shrink-0">NIS: {studentNis || '-'}</span>
                        </p>
                        {periodStr && (
                            <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1 truncate">{periodStr}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
