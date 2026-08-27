import React, { useState, useMemo } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { GraduationCap, Search, Users, Sparkles } from 'lucide-react';
import { ClassCard, type ClassItemProps } from '@/components/classes';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Kelas Saya', href: '/classes' },
];

interface ClassIndexProps {
    classes: ClassItemProps[];
}

export function extractGrade(name: string): string {
    const match = name.match(/(\d+)/);
    if (match) return `KELAS ${match[1]}`;
    return 'KELAS LAINNYA';
}

export default function ClassIndex({ classes = [] }: ClassIndexProps) {
    const [searchQuery, setSearchQuery] = useState('');

    // Deduplicate / Clean invalid duplicate empty entries if populated class exists
    const sanitizedClasses = useMemo(() => {
        const map = new Map<string, ClassItemProps>();
        for (const item of classes) {
            const key = item.name.trim().toLowerCase();
            const existing = map.get(key);
            if (!existing || (item.students_count > existing.students_count)) {
                map.set(key, item);
            }
        }
        return Array.from(map.values());
    }, [classes]);

    const filteredClasses = useMemo(() => {
        if (!searchQuery.trim()) return sanitizedClasses;
        const q = searchQuery.toLowerCase();
        return sanitizedClasses.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                (c.subjects && c.subjects.some((s) => s.toLowerCase().includes(q)))
        );
    }, [sanitizedClasses, searchQuery]);

    const totalStudents = useMemo(() => {
        return sanitizedClasses.reduce((sum, c) => sum + (c.students_count || 0), 0);
    }, [sanitizedClasses]);

    // Group filtered classes by Grade Level
    const groupedClasses = useMemo(() => {
        const groups: Record<string, ClassItemProps[]> = {};
        for (const item of filteredClasses) {
            const grade = extractGrade(item.name);
            if (!groups[grade]) groups[grade] = [];
            groups[grade].push(item);
        }
        return groups;
    }, [filteredClasses]);

    const groupKeys = Object.keys(groupedClasses).sort();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Kelas Saya - LMS Mokopani" />

            <div className="space-y-4 sm:space-y-5 fade-in pb-16 md:pb-6 max-w-7xl mx-auto w-full min-w-0">
                {/* Header: Kelas Saya + Compact Subtitle */}
                <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                            <GraduationCap className="h-6 w-6 text-primary shrink-0" />
                            <span>Kelas Saya</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
                            {sanitizedClasses.length} Kelas • {totalStudents} Siswa
                        </p>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Cari kelas (misal: 8A, 9B)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-11 pl-10 pr-4 text-xs sm:text-sm rounded-2xl bg-card border border-border/70 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition shadow-2xs placeholder:text-muted-foreground/70"
                    />
                </div>

                {/* Class List by Group */}
                {filteredClasses.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center border border-dashed border-border/70 rounded-2xl p-6 bg-card/40">
                        <GraduationCap className="h-10 w-10 text-muted-foreground/40 mb-2" />
                        <h3 className="text-sm font-bold text-foreground">
                            {searchQuery ? 'Kelas Tidak Ditemukan' : 'Belum Ada Kelas Diampu'}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                            {searchQuery
                                ? `Tidak ada kelas yang cocok dengan kata kunci "${searchQuery}".`
                                : 'Daftar kelas yang ditugaskan kepada Anda akan tampil di sini.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {groupKeys.map((gradeKey) => (
                            <div key={gradeKey} className="space-y-2.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-muted-foreground tracking-wider uppercase">
                                        {gradeKey}
                                    </span>
                                    <div className="h-px flex-1 bg-border/60" />
                                    <span className="text-[11px] font-bold text-muted-foreground/70">
                                        {groupedClasses[gradeKey].length} Kelas
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-2.5 sm:gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                                    {groupedClasses[gradeKey].map((item) => (
                                        <ClassCard key={item.id} classItem={item} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
