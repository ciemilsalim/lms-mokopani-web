import React from 'react';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';

interface Student {
    id: number;
    name: string;
    nis: string;
}

interface StudentSwitcherProps {
    students: Student[];
    currentIndex: number;
    onSelectIndex: (index: number) => void;
    className?: string;
}

export function StudentSwitcher({
    students = [],
    currentIndex,
    onSelectIndex,
    className = '',
}: StudentSwitcherProps) {
    if (students.length === 0) return null;

    const currentStudent = students[currentIndex];
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === students.length - 1;

    return (
        <div className={`flex items-center justify-between gap-2 bg-card p-3 rounded-2xl border border-border/80 shadow-xs ${className}`}>
            <button
                type="button"
                disabled={isFirst}
                onClick={() => onSelectIndex(currentIndex - 1)}
                className="inline-flex items-center justify-center h-11 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground hover:bg-muted transition disabled:opacity-30 cursor-pointer min-h-[44px]"
                title="Siswa Sebelumnya"
            >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Sebelumnya</span>
            </button>

            {/* Student Jump Select */}
            <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
                <Users className="h-4 w-4 text-primary shrink-0" />
                <select
                    value={currentIndex}
                    onChange={(e) => onSelectIndex(Number(e.target.value))}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20 max-w-[220px] truncate cursor-pointer min-h-[44px]"
                >
                    {students.map((s, idx) => (
                        <option key={s.id} value={idx}>
                            {idx + 1}. {s.name} ({s.nis})
                        </option>
                    ))}
                </select>
            </div>

            <button
                type="button"
                disabled={isLast}
                onClick={() => onSelectIndex(currentIndex + 1)}
                className="inline-flex items-center justify-center h-11 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground hover:bg-muted transition disabled:opacity-30 cursor-pointer min-h-[44px]"
                title="Siswa Berikutnya"
            >
                <span className="hidden sm:inline mr-1">Berikutnya</span>
                <ChevronRight className="h-4 w-4" />
            </button>
        </div>
    );
}
