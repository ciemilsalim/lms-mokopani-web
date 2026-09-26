import React, { useState, useMemo } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import {
    GraduationCap,
    Search,
    Users,
    Layers,
    CheckCircle2,
    XCircle,
    Camera,
    LayoutGrid,
    List,
    Copy,
    Check,
    X,
    Maximize2,
    Calendar,
    Sparkles,
    ShieldCheck,
    AlertCircle,
    UserCheck,
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Data Siswa', href: '/students' },
];

export interface Student {
    id: number;
    name: string;
    nis: string;
    email?: string | null;
    class_id?: number | null;
    class_name: string | null;
    photo: string | null;
    religion?: string | null;
    has_account: boolean;
    is_active?: boolean;
}

export interface ClassOption {
    name: string;
    count: number;
}

export interface StudentStats {
    total_students: number;
    total_classes: number;
    with_account: number;
    with_photo: number;
}

interface StudentsProps {
    students: Student[];
    classes?: ClassOption[];
    stats?: StudentStats;
    period?: string;
}

const avatarGradients = [
    'from-blue-600 to-indigo-700',
    'from-emerald-600 to-teal-700',
    'from-violet-600 to-purple-800',
    'from-rose-600 to-pink-700',
    'from-amber-600 to-orange-700',
    'from-cyan-600 to-blue-700',
    'from-fuchsia-600 to-purple-700',
];

const getInitials = (name: string) => {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase();
};

/**
 * Reusable student avatar with fallback and smooth loading
 */
function StudentAvatar({
    name,
    photo,
    size = 'md',
    className = '',
    onClick,
}: {
    name: string;
    photo?: string | null;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    onClick?: () => void;
}) {
    const [imageError, setImageError] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    const sizeClasses = {
        sm: 'h-9 w-9 text-xs',
        md: 'h-12 w-12 text-sm',
        lg: 'h-16 w-16 text-base',
        xl: 'h-28 w-28 text-3xl',
    }[size];

    const initials = getInitials(name || 'Siswa');
    const charCodeSum = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradient = avatarGradients[Math.abs(charCodeSum) % avatarGradients.length];

    const hasPhoto = Boolean(photo) && !imageError;

    return (
        <div
            onClick={onClick}
            className={`group relative rounded-full shrink-0 overflow-hidden ring-2 ring-border/70 shadow-sm ${sizeClasses} ${className} ${
                onClick ? 'cursor-pointer hover:ring-primary hover:scale-[1.03] transition-all' : ''
            }`}
            title={onClick ? `Lihat foto ${name}` : name}
        >
            {hasPhoto ? (
                <>
                    {!isLoaded && (
                        <div
                            className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${gradient} text-white font-bold animate-pulse`}
                        >
                            {initials}
                        </div>
                    )}
                    <img
                        src={photo!}
                        alt={name}
                        loading="lazy"
                        onLoad={() => setIsLoaded(true)}
                        onError={() => setImageError(true)}
                        className={`h-full w-full object-cover transition-all duration-300 ${
                            isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                        }`}
                    />
                    {onClick && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Maximize2 className="h-4 w-4" />
                        </div>
                    )}
                </>
            ) : (
                <div
                    className={`h-full w-full flex items-center justify-center bg-gradient-to-br ${gradient} text-white font-bold tracking-wider select-none`}
                >
                    {initials}
                </div>
            )}
        </div>
    );
}

export default function Students({
    students = [],
    classes = [],
    stats = {
        total_students: 0,
        total_classes: 0,
        with_account: 0,
        with_photo: 0,
    },
    period = '',
}: StudentsProps) {
    const [search, setSearch] = useState('');
    const [filterClass, setFilterClass] = useState('all');
    const [filterAccount, setFilterAccount] = useState<'all' | 'active' | 'none'>('all');
    const [filterPhoto, setFilterPhoto] = useState<'all' | 'with_photo' | 'no_photo'>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [copiedNis, setCopiedNis] = useState<string | null>(null);

    // Compute unique class list fallback if not supplied
    const classOptions = useMemo(() => {
        if (classes.length > 0) return classes;
        const map = new Map<string, number>();
        students.forEach((s) => {
            const cName = s.class_name || 'Tanpa Kelas';
            map.set(cName, (map.get(cName) || 0) + 1);
        });
        return Array.from(map.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    }, [classes, students]);

    // Active counts
    const computedStats = useMemo(() => {
        if (stats && stats.total_students > 0) return stats;
        return {
            total_students: students.length,
            total_classes: classOptions.length,
            with_account: students.filter((s) => s.has_account).length,
            with_photo: students.filter((s) => Boolean(s.photo)).length,
        };
    }, [stats, students, classOptions]);

    // Filtered students
    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        return students.filter((s) => {
            const matchesSearch =
                !query ||
                s.name.toLowerCase().includes(query) ||
                s.nis.toLowerCase().includes(query) ||
                (s.class_name ?? '').toLowerCase().includes(query) ||
                (s.email ?? '').toLowerCase().includes(query);

            const matchesClass = filterClass === 'all' || s.class_name === filterClass;

            const matchesAccount =
                filterAccount === 'all' ||
                (filterAccount === 'active' && s.has_account) ||
                (filterAccount === 'none' && !s.has_account);

            const matchesPhoto =
                filterPhoto === 'all' ||
                (filterPhoto === 'with_photo' && Boolean(s.photo)) ||
                (filterPhoto === 'no_photo' && !s.photo);

            return matchesSearch && matchesClass && matchesAccount && matchesPhoto;
        });
    }, [students, search, filterClass, filterAccount, filterPhoto]);

    const handleCopyNis = (nis: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        navigator.clipboard.writeText(nis);
        setCopiedNis(nis);
        setTimeout(() => setCopiedNis(null), 2000);
    };

    const hasActiveFilters = search || filterClass !== 'all' || filterAccount !== 'all' || filterPhoto !== 'all';

    const handleResetFilters = () => {
        setSearch('');
        setFilterClass('all');
        setFilterAccount('all');
        setFilterPhoto('all');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Data Siswa – LMS Mokopani" />

            <div className="space-y-5 fade-in pb-24 sm:pb-10 max-w-7xl mx-auto w-full min-w-0">
                {/* 1. Header Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5 sm:p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
                                    <GraduationCap className="h-6 w-6" />
                                </div>
                                <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                                    Data Siswa
                                </h1>
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
                                Direktori data profil siswa, foto resmi, dan status akun pembelajaran LMS Mokopani
                            </p>
                        </div>

                        {period && (
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-background/80 backdrop-blur-sm border border-border/80 text-xs font-bold text-foreground shadow-xs self-start sm:self-auto">
                                <Calendar className="h-3.5 w-3.5 text-primary" />
                                <span>{period}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Statistical Highlights */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-4.5 shadow-xs flex items-center gap-3.5 transition hover:border-primary/30">
                        <div className="h-11 w-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <Users className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-muted-foreground truncate">Total Siswa</p>
                            <p className="text-lg sm:text-2xl font-black text-foreground tracking-tight">
                                {computedStats.total_students}
                            </p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-4.5 shadow-xs flex items-center gap-3.5 transition hover:border-primary/30">
                        <div className="h-11 w-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <Layers className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-muted-foreground truncate">Kelas Terdaftar</p>
                            <p className="text-lg sm:text-2xl font-black text-foreground tracking-tight">
                                {computedStats.total_classes}
                            </p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-4.5 shadow-xs flex items-center gap-3.5 transition hover:border-primary/30">
                        <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <UserCheck className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-muted-foreground truncate">Akun LMS Aktif</p>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-lg sm:text-2xl font-black text-foreground tracking-tight">
                                    {computedStats.with_account}
                                </span>
                                <span className="text-[11px] font-bold text-muted-foreground">
                                    (
                                    {computedStats.total_students > 0
                                        ? Math.round(
                                              (computedStats.with_account / computedStats.total_students) * 100,
                                          )
                                        : 0}
                                    %)
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-4.5 shadow-xs flex items-center gap-3.5 transition hover:border-primary/30">
                        <div className="h-11 w-11 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                            <Camera className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-muted-foreground truncate">Foto Terpasang</p>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-lg sm:text-2xl font-black text-foreground tracking-tight">
                                    {computedStats.with_photo}
                                </span>
                                <span className="text-[11px] font-bold text-muted-foreground">
                                    (
                                    {computedStats.total_students > 0
                                        ? Math.round(
                                              (computedStats.with_photo / computedStats.total_students) * 100,
                                          )
                                        : 0}
                                    %)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Filter Controls & View Switcher */}
                <div className="rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4 shadow-xs space-y-3">
                    <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                        {/* Search Input */}
                        <div className="relative flex-1 max-w-lg">
                            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                id="input-search-student"
                                type="text"
                                placeholder="Cari nama siswa, NIS, atau kelas..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full rounded-xl border border-border/80 bg-background/60 py-2.5 pl-10 pr-9 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Filter Selects & View Mode Buttons */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                            {/* Class filter */}
                            <select
                                value={filterClass}
                                onChange={(e) => setFilterClass(e.target.value)}
                                className="rounded-xl border border-border/80 bg-background py-2 px-3 text-xs font-medium text-foreground outline-none transition focus:border-primary cursor-pointer shrink-0"
                            >
                                <option value="all">Semua Kelas ({students.length})</option>
                                {classOptions.map((c) => (
                                    <option key={c.name} value={c.name}>
                                        {c.name} ({c.count})
                                    </option>
                                ))}
                            </select>

                            {/* Account filter */}
                            <select
                                value={filterAccount}
                                onChange={(e) => setFilterAccount(e.target.value as any)}
                                className="rounded-xl border border-border/80 bg-background py-2 px-3 text-xs font-medium text-foreground outline-none transition focus:border-primary cursor-pointer shrink-0"
                            >
                                <option value="all">Status Akun (Semua)</option>
                                <option value="active">✓ Akun Aktif</option>
                                <option value="none">✕ Belum Ada Akun</option>
                            </select>

                            {/* Photo filter */}
                            <select
                                value={filterPhoto}
                                onChange={(e) => setFilterPhoto(e.target.value as any)}
                                className="rounded-xl border border-border/80 bg-background py-2 px-3 text-xs font-medium text-foreground outline-none transition focus:border-primary cursor-pointer shrink-0"
                            >
                                <option value="all">Status Foto (Semua)</option>
                                <option value="with_photo">📷 Ada Foto</option>
                                <option value="no_photo">Belum Ada Foto</option>
                            </select>

                            {/* View Switcher */}
                            <div className="inline-flex rounded-xl bg-muted/60 p-1 border border-border/60 shrink-0 ml-auto lg:ml-0">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                                        viewMode === 'grid'
                                            ? 'bg-background text-foreground shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                    title="Tampilan Kartu Grid"
                                >
                                    <LayoutGrid className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Grid</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('table')}
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                                        viewMode === 'table'
                                            ? 'bg-background text-foreground shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                    title="Tampilan Tabel"
                                >
                                    <List className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Tabel</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Active Filter Indicators */}
                    {hasActiveFilters && (
                        <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground border-t border-border/40">
                            <span>
                                Menampilkan <strong>{filtered.length}</strong> dari {students.length} siswa
                            </span>
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className="inline-flex items-center gap-1 text-primary hover:underline font-medium cursor-pointer ml-auto"
                            >
                                <X className="h-3 w-3" />
                                Reset Filter
                            </button>
                        </div>
                    )}
                </div>

                {/* 4. Main Content: Grid vs Table View */}
                {filtered.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 p-12 text-center flex flex-col items-center justify-center">
                        <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
                            <GraduationCap className="h-8 w-8 opacity-40" />
                        </div>
                        <h3 className="text-base font-bold text-foreground">Tidak Ada Siswa Ditemukan</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-sm">
                            Tidak ditemukan siswa yang cocok dengan kriteria pencarian atau filter yang dipilih.
                        </p>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition cursor-pointer"
                            >
                                Bersihkan Pencarian
                            </button>
                        )}
                    </div>
                ) : viewMode === 'grid' ? (
                    /* ─── GRID VIEW ─────────────────────────────────────── */
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filtered.map((student) => (
                            <div
                                key={student.id}
                                onClick={() => setSelectedStudent(student)}
                                className="group relative rounded-2xl border border-border/70 bg-card p-4.5 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
                            >
                                <div>
                                    {/* Top Card Row: Photo & Status Chip */}
                                    <div className="flex items-start justify-between gap-3 mb-3.5">
                                        <StudentAvatar
                                            name={student.name}
                                            photo={student.photo}
                                            size="lg"
                                            className="ring-2 ring-primary/20"
                                        />

                                        <div className="flex flex-col items-end gap-1.5">
                                            {/* Class Badge */}
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                                                {student.class_name || 'Tanpa Kelas'}
                                            </span>

                                            {/* Account Badge */}
                                            <span
                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                                    student.has_account
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                        : 'bg-muted text-muted-foreground border border-border/60'
                                                }`}
                                            >
                                                {student.has_account ? (
                                                    <>
                                                        <CheckCircle2 className="h-2.5 w-2.5" />
                                                        <span>LMS Aktif</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <XCircle className="h-2.5 w-2.5 opacity-60" />
                                                        <span>Tanpa Akun</span>
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Student Identity */}
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                            {student.name}
                                        </h3>

                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                                            <span>NIS: {student.nis}</span>
                                            <button
                                                type="button"
                                                onClick={(e) => handleCopyNis(student.nis, e)}
                                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition"
                                                title="Salin NIS"
                                            >
                                                {copiedNis === student.nis ? (
                                                    <Check className="h-3 w-3 text-emerald-500" />
                                                ) : (
                                                    <Copy className="h-3 w-3" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Footer: Quick Details */}
                                <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="truncate max-w-[150px]">
                                        {student.email || 'Email belum diatur'}
                                    </span>
                                    <span className="text-[11px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                        Detail
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* ─── TABLE VIEW ────────────────────────────────────── */
                    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
                        <div className="overflow-x-auto scrollbar-thin">
                            <table className="min-w-full divide-y divide-border/60 text-left text-xs">
                                <thead className="bg-muted/50 font-bold uppercase tracking-wider text-muted-foreground">
                                    <tr>
                                        <th scope="col" className="px-4 py-3.5 w-12 text-center">
                                            #
                                        </th>
                                        <th scope="col" className="px-4 py-3.5">
                                            Siswa
                                        </th>
                                        <th scope="col" className="px-4 py-3.5">
                                            NIS
                                        </th>
                                        <th scope="col" className="px-4 py-3.5">
                                            Kelas
                                        </th>
                                        <th scope="col" className="px-4 py-3.5">
                                            Status Akun LMS
                                        </th>
                                        <th scope="col" className="px-4 py-3.5">
                                            Foto Profil
                                        </th>
                                        <th scope="col" className="px-4 py-3.5 text-right">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {filtered.map((student, idx) => (
                                        <tr
                                            key={student.id}
                                            onClick={() => setSelectedStudent(student)}
                                            className="hover:bg-muted/40 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-4 py-3 text-center text-muted-foreground font-mono">
                                                {idx + 1}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <StudentAvatar
                                                        name={student.name}
                                                        photo={student.photo}
                                                        size="sm"
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                                                            {student.name}
                                                        </p>
                                                        {student.email && (
                                                            <p className="text-[11px] text-muted-foreground truncate">
                                                                {student.email}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-foreground font-medium">
                                                <div className="flex items-center gap-1.5">
                                                    <span>{student.nis}</span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleCopyNis(student.nis, e)}
                                                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition opacity-0 group-hover:opacity-100"
                                                        title="Salin NIS"
                                                    >
                                                        {copiedNis === student.nis ? (
                                                            <Check className="h-3 w-3 text-emerald-500" />
                                                        ) : (
                                                            <Copy className="h-3 w-3" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                                    {student.class_name || '-'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                                        student.has_account
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                            : 'bg-muted text-muted-foreground border border-border/60'
                                                    }`}
                                                >
                                                    {student.has_account ? (
                                                        <>
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            <span>Aktif</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XCircle className="h-3 w-3 opacity-60" />
                                                            <span>Belum Ada</span>
                                                        </>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {student.photo ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 dark:text-violet-400">
                                                        <Camera className="h-3 w-3" />
                                                        Terpasang
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-muted-foreground">
                                                        Belum ada
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedStudent(student);
                                                    }}
                                                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-primary hover:bg-primary/10 transition cursor-pointer"
                                                >
                                                    Detail
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 5. Student Detail Modal / Dialog */}
                {selectedStudent && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
                        onClick={() => setSelectedStudent(null)}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
                        >
                            {/* Close Button */}
                            <button
                                type="button"
                                onClick={() => setSelectedStudent(null)}
                                className="absolute right-4 top-4 p-1.5 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition"
                            >
                                <X className="h-4 w-4" />
                            </button>

                            {/* Header / Avatar Profile */}
                            <div className="flex flex-col items-center text-center space-y-3 pt-2">
                                <StudentAvatar
                                    name={selectedStudent.name}
                                    photo={selectedStudent.photo}
                                    size="xl"
                                    className="ring-4 ring-primary/20 shadow-md"
                                />

                                <div className="space-y-1">
                                    <h2 className="text-lg font-black text-foreground">
                                        {selectedStudent.name}
                                    </h2>
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                                            {selectedStudent.class_name || 'Tanpa Kelas'}
                                        </span>
                                        {selectedStudent.religion && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">
                                                {selectedStudent.religion}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Details List */}
                            <div className="rounded-xl border border-border/70 bg-muted/30 divide-y divide-border/60 text-xs">
                                <div className="flex items-center justify-between p-3">
                                    <span className="text-muted-foreground font-medium">Nomor Induk Siswa (NIS)</span>
                                    <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
                                        <span>{selectedStudent.nis}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopyNis(selectedStudent.nis)}
                                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                                            title="Salin NIS"
                                        >
                                            {copiedNis === selectedStudent.nis ? (
                                                <Check className="h-3 w-3 text-emerald-500" />
                                            ) : (
                                                <Copy className="h-3 w-3" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-3">
                                    <span className="text-muted-foreground font-medium">Email / Akun LMS</span>
                                    <span className="font-mono text-foreground font-medium">
                                        {selectedStudent.email || 'Belum diatur'}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between p-3">
                                    <span className="text-muted-foreground font-medium">Status Akun Login</span>
                                    <span
                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                            selectedStudent.has_account
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                : 'bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {selectedStudent.has_account ? (
                                            <>
                                                <CheckCircle2 className="h-3 w-3" />
                                                <span>Aktif & Siap Digunakan</span>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="h-3 w-3 opacity-60" />
                                                <span>Belum Dibuatkan Akun</span>
                                            </>
                                        )}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between p-3">
                                    <span className="text-muted-foreground font-medium">Foto Profil</span>
                                    <span className="text-foreground font-medium">
                                        {selectedStudent.photo ? (
                                            <a
                                                href={selectedStudent.photo}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-primary hover:underline font-bold inline-flex items-center gap-1"
                                            >
                                                <span>Buka Foto Asli</span>
                                                <Maximize2 className="h-3 w-3" />
                                            </a>
                                        ) : (
                                            <span className="text-muted-foreground">Belum ada foto</span>
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedStudent(null)}
                                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xs hover:bg-primary/90 transition cursor-pointer"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
