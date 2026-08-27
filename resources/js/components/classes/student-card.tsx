import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useInitials } from '@/hooks/use-initials';
import { CheckCircle2, Circle } from 'lucide-react';

export interface StudentItemProps {
    id: number;
    name: string;
    nis?: string | null;
    photo_url?: string | null;
    has_account?: boolean;
}

interface StudentCardProps {
    student: StudentItemProps;
    className?: string;
}

export function StudentCard({ student, className = '' }: StudentCardProps) {
    const getInitials = useInitials();

    return (
        <div
            className={`group relative flex items-center justify-between gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-card border border-border/60 hover:border-primary/40 shadow-2xs transition-all min-h-[56px] ${className}`}
        >
            <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-10 w-10 shrink-0 rounded-2xl border border-border/80 shadow-2xs">
                    <AvatarImage src={student.photo_url || ''} alt={student.name} className="object-cover" />
                    <AvatarFallback className="rounded-2xl bg-primary/10 text-primary font-bold text-xs">
                        {getInitials(student.name)}
                    </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {student.name}
                    </h4>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5 font-medium">
                        {student.nis ? `NIS: ${student.nis}` : 'Siswa Terdaftar'}
                    </p>
                </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
                {student.has_account ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        <span className="hidden sm:inline">Akun</span> Aktif
                    </Badge>
                ) : (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <Circle className="h-3 w-3" />
                        Belum Aktif
                    </Badge>
                )}
            </div>
        </div>
    );
}
