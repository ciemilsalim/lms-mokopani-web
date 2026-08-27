import React, { useState, useMemo } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { GraduationCap, Search, Users } from 'lucide-react';
import { SectionHeader, EmptyState } from '@/components/dashboard';
import { ClassCard, type ClassItemProps } from '@/components/classes';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Daftar Kelas', href: '/classes' },
];

interface ClassIndexProps {
    classes: ClassItemProps[];
}

export default function ClassIndex({ classes = [] }: ClassIndexProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredClasses = useMemo(() => {
        if (!searchQuery.trim()) return classes;
        const q = searchQuery.toLowerCase();
        return classes.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                (c.subjects && c.subjects.some((s) => s.toLowerCase().includes(q)))
        );
    }, [classes, searchQuery]);

    const totalStudents = useMemo(() => {
        return classes.reduce((sum, c) => sum + (c.students_count || 0), 0);
    }, [classes]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Daftar Kelas - LMS Mokopani" />

            <div className="space-y-5 sm:space-y-6 fade-in pb-16 md:pb-6 max-w-7xl mx-auto px-4 sm:px-6">
                {/* Header & Quick Summary */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                    <div>
                        <SectionHeader
                            title="Kelas Diampu"
                            subtitle="Kelola pembelajaran, siswa, dan asesmen per kelas"
                            icon={GraduationCap}
                        />
                    </div>
                    
                    <div className="flex items-center gap-2 self-start sm:self-auto bg-primary/10 border border-primary/20 px-3.5 py-1.5 rounded-2xl text-xs font-bold text-primary">
                        <Users className="h-4 w-4" />
                        <span>{classes.length} Kelas</span>
                        <span>•</span>
                        <span>{totalStudents} Siswa</span>
                    </div>
                </div>

                {/* Search Input */}
                <div className="relative max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Cari kelas atau mata pelajaran..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-11 pl-10 pr-4 text-xs sm:text-sm rounded-2xl bg-card border border-border/70 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition shadow-2xs"
                    />
                </div>

                {/* Class List Grid */}
                {filteredClasses.length === 0 ? (
                    <EmptyState
                        icon={GraduationCap}
                        title={searchQuery ? 'Kelas Tidak Ditemukan' : 'Belum Ada Kelas Diampu'}
                        description={
                            searchQuery
                                ? `Tidak ada kelas yang cocok dengan pencarian "${searchQuery}".`
                                : 'Daftar kelas yang ditugaskan kepada Anda akan tampil di sini.'
                        }
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-3.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredClasses.map((item) => (
                            <ClassCard key={item.id} classItem={item} />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
