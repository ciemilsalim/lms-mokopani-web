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
    className?: string;
}

export function AssessmentFilter({
    search,
    onSearchChange,
    userRole,
    filterType = 'all',
    onFilterTypeChange,
    studentStatusFilter = 'all',
    onStudentStatusFilterChange,
    className = '',
}: AssessmentFilterProps) {
    const isStudent = userRole === 'student';

    return (
        <div className={`flex flex-col gap-3 md:flex-row md:items-center justify-between ${className}`}>
            {/* Filter Pills */}
            {isStudent ? (
                <div className="flex p-1 bg-muted/70 rounded-2xl w-full sm:w-fit overflow-x-auto scrollbar-hide border border-border/50">
                    {[
                        { id: 'all', label: 'Semua Status' },
                        { id: 'pending', label: 'Perlu Dikerjakan' },
                        { id: 'submitted', label: 'Menunggu Penilaian' },
                        { id: 'graded', label: 'Selesai Dinilai' },
                    ].map(f => (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => onStudentStatusFilterChange && onStudentStatusFilterChange(f.id as any)}
                            className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer min-h-[40px] ${
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
                <div className="flex p-1 bg-muted rounded-2xl w-full sm:w-fit overflow-x-auto scrollbar-hide border border-border/50">
                    {[
                        { id: 'all', label: 'Semua' },
                        { id: 'initial', label: 'Awal' },
                        { id: 'formative', label: 'Formatif' },
                        { id: 'summative', label: 'Sumatif' },
                    ].map(f => (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => onFilterTypeChange && onFilterTypeChange(f.id)}
                            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer min-h-[40px] ${
                                filterType === f.id
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Search Input */}
            <div className="relative max-w-full md:max-w-xs flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                    type="text"
                    placeholder="Cari asesmen, kelas, atau mapel..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full rounded-xl border border-border/70 bg-card py-2.5 pl-10 pr-9 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition min-h-[42px] shadow-2xs"
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => onSearchChange('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition rounded-lg"
                        title="Hapus pencarian"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}
