import React from 'react';
import { Search, X } from 'lucide-react';

interface AssessmentFilterProps {
    search: string;
    onSearchChange: (value: string) => void;
    userRole: 'teacher' | 'student' | 'admin' | string;
    filterType?: string;
    onFilterTypeChange?: (type: string) => void;
    studentStatusFilter?: 'all' | 'pending' | 'submitted' | 'graded';
    onStudentStatusFilterChange?: (status: 'all' | 'pending' | 'submitted' | 'graded') => void;
    countsByType?: { all?: number; initial?: number; formative?: number; summative?: number };
    className?: string;
}

/**
 * AssessmentFilter
 * Mobile-Native filter tabs (44px target) & search bar (48px height, 16px radius).
 */
export function AssessmentFilter({
    search,
    onSearchChange,
    userRole,
    filterType = 'all',
    onFilterTypeChange,
    studentStatusFilter = 'all',
    onStudentStatusFilterChange,
    countsByType,
    className = '',
}: AssessmentFilterProps) {
    const isStudent = userRole === 'student';

    return (
        <div className={`flex flex-col gap-3 w-full min-w-0 ${className}`}>
            {/* Filter Tabs */}
            {isStudent ? (
                <div className="flex p-1 bg-muted/80 rounded-2xl w-full overflow-x-auto scrollbar-hide border border-border/60 shrink-0 gap-1 min-h-[50px] items-center">
                    {[
                        { id: 'all', label: 'Semua' },
                        { id: 'pending', label: 'Perlu Dikerjakan' },
                        { id: 'submitted', label: 'Menunggu Nilai' },
                        { id: 'graded', label: 'Selesai' },
                    ].map(f => (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => onStudentStatusFilterChange && onStudentStatusFilterChange(f.id as any)}
                            className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer min-h-[44px] flex items-center justify-center ${
                                studentStatusFilter === f.id
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            ) : (
                <div className="flex p-1 bg-muted/80 rounded-2xl w-full overflow-x-auto scrollbar-hide border border-border/60 shrink-0 gap-1 min-h-[50px] items-center">
                    {[
                        { id: 'all', label: 'Semua', count: countsByType?.all },
                        { id: 'initial', label: 'Awal', count: countsByType?.initial },
                        { id: 'formative', label: 'Formatif', count: countsByType?.formative },
                        { id: 'summative', label: 'Sumatif', count: countsByType?.summative },
                    ].map(f => {
                        const isActive = filterType === f.id;
                        return (
                            <button
                                key={f.id}
                                type="button"
                                onClick={() => onFilterTypeChange && onFilterTypeChange(f.id)}
                                className={`inline-flex items-center justify-center gap-1.5 shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer min-h-[44px] ${
                                    isActive
                                        ? 'bg-card text-foreground shadow-xs font-black border border-border/60'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <span>{f.label}</span>
                                {f.count !== undefined && (
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                                        isActive
                                            ? 'bg-primary/10 text-primary font-bold'
                                            : 'bg-muted-foreground/15 text-muted-foreground font-semibold'
                                    }`}>
                                        {f.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Search Input (48px height, 16px radius, 20px icon) */}
            <div className="relative w-full min-w-0">
                <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                    type="text"
                    placeholder="Cari asesmen, kelas, atau mapel..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full rounded-2xl border border-border/70 bg-card py-2.5 pl-11 pr-10 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition min-h-[48px] shadow-2xs box-border"
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => onSearchChange('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition rounded-xl active:bg-muted"
                        title="Hapus pencarian"
                        aria-label="Hapus pencarian"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

export default AssessmentFilter;
