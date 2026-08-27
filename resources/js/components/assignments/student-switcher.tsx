import React from 'react';
import { ChevronLeft, ChevronRight, Check, Clock, User } from 'lucide-react';

interface Student {
    id: number;
    name: string;
    nis?: string;
    photo_url?: string;
}

interface StudentSwitcherProps {
    students: Student[];
    submissionsMap?: Record<number, { score: number | null; submitted_at?: string }>;
    currentIndex: number;
    onSelectIndex: (index: number) => void;
    className?: string;
}

export function StudentSwitcher({
    students = [],
    submissionsMap = {},
    currentIndex,
    onSelectIndex,
    className = '',
}: StudentSwitcherProps) {
    if (students.length === 0) return null;

    const currentStudent = students[currentIndex];
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === students.length - 1;

    const currentSub = submissionsMap[currentStudent?.id];
    const isCurrentScored = currentSub && currentSub.score !== null && currentSub.score !== undefined;
    const isCurrentSubmitted = !!currentSub;

    return (
        <div className={`w-full max-w-full bg-card rounded-2xl border border-border p-2 sm:p-3 shadow-xs space-y-2 overflow-hidden ${className}`}>
            {/* Top Row: Navigation bar + Counter + Quick Switcher */}
            <div className="flex items-center justify-between gap-1.5 w-full">
                {/* Previous Button */}
                <button
                    type="button"
                    disabled={isFirst}
                    onClick={() => onSelectIndex(currentIndex - 1)}
                    className="inline-flex items-center justify-center h-8 sm:h-9 w-8 sm:w-auto sm:px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground hover:bg-muted active:scale-95 transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer shrink-0"
                    title="Siswa Sebelumnya"
                >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Sebelumnya</span>
                </button>

                {/* Center: Counter & Quick Dropdown (Fluid & Ellipsis-safe) */}
                <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-center max-w-[calc(100%-80px)] sm:max-w-none">
                    <span className="text-[11px] sm:text-xs font-black text-primary font-mono px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 shrink-0 leading-none">
                        {String(currentIndex + 1).padStart(2, '0')}/{String(students.length).padStart(2, '0')}
                    </span>

                    <div className="relative min-w-0 flex-1 max-w-[190px] sm:max-w-[260px]">
                        <select
                            value={currentIndex}
                            onChange={(e) => onSelectIndex(Number(e.target.value))}
                            className="w-full rounded-xl border border-border bg-background pl-2 pr-6 py-1 text-[11px] sm:text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20 truncate cursor-pointer h-8 sm:h-9 appearance-none"
                        >
                            {students.map((s, idx) => {
                                const sub = submissionsMap[s.id];
                                const scored = sub && sub.score !== null && sub.score !== undefined;
                                const submitted = !!sub;
                                const statusLabel = scored ? `✓ ${sub.score}` : submitted ? '⏳' : '○';
                                return (
                                    <option key={s.id} value={idx}>
                                        {String(idx + 1).padStart(2, '0')}. {s.name} ({statusLabel})
                                    </option>
                                );
                            })}
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                            <span className="text-[9px]">▼</span>
                        </div>
                    </div>
                </div>

                {/* Next Button */}
                <button
                    type="button"
                    disabled={isLast}
                    onClick={() => onSelectIndex(currentIndex + 1)}
                    className="inline-flex items-center justify-center h-8 sm:h-9 w-8 sm:w-auto sm:px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground hover:bg-muted active:scale-95 transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer shrink-0"
                    title="Siswa Berikutnya"
                >
                    <span className="hidden sm:inline mr-1">Berikutnya</span>
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            {/* Bottom Row: Active Student Identity & Assessment Status */}
            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/60 w-full">
                <div className="min-w-0 flex-1 flex items-center gap-2">
                    <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                        {currentStudent?.name?.charAt(0)?.toUpperCase() || <User className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-xs sm:text-sm font-bold text-foreground truncate leading-tight">
                            {currentStudent?.name}
                        </h3>
                        {currentStudent?.nis && (
                            <p className="text-[10px] font-mono text-muted-foreground leading-tight truncate">
                                NIS: {currentStudent.nis}
                            </p>
                        )}
                    </div>
                </div>

                <div className="shrink-0">
                    {isCurrentScored ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] sm:text-[11px] font-black border border-emerald-500/20">
                            <Check className="h-3 w-3 stroke-[3]" />
                            <span>Nilai: <strong>{currentSub.score}</strong></span>
                        </span>
                    ) : isCurrentSubmitted ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[10px] sm:text-[11px] font-bold border border-blue-500/20">
                            <Clock className="h-3 w-3" />
                            <span>Terkumpul</span>
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-muted text-muted-foreground text-[10px] sm:text-[11px] font-medium border border-border">
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                            <span>Belum dinilai</span>
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default StudentSwitcher;
