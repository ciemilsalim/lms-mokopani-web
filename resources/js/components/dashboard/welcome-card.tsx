import React, { useMemo } from 'react';
import { Link } from '@inertiajs/react';
import {
    Sparkles,
    BookOpen,
    School,
    Calendar,
    ArrowUpRight,
    Plus,
    Award,
    ShieldCheck,
    Clock,
} from 'lucide-react';

export interface IdentityProps {
    name: string;
    role: string;
    idLabel?: string;
    idValue?: string;
    extra?: string;
    sekolah: string;
    tahunAjaran?: string;
    semester?: string;
}

export interface WelcomeCardProps {
    identity?: IdentityProps;
    userRole?: string;
    illustrationSrc?: string;
    className?: string;
    todayName?: string;
    dateText?: string;
}

const roleLabelMap: Record<string, string> = {
    admin: 'Administrator',
    teacher: 'Guru Mata Pelajaran',
    student: 'Siswa',
    parent: 'Orang Tua',
    user: 'Pengguna',
};

/**
 * WelcomeCard
 * Modern, responsive hero banner for the dashboard with rich aesthetics, glassmorphism badges, and quick actions.
 */
export function WelcomeCard({
    identity,
    userRole = 'teacher',
    illustrationSrc,
    className = '',
    todayName,
    dateText,
}: WelcomeCardProps) {
    const defaultIllustration = userRole === 'student' ? '/student-illustration.png' : '/teacher-illustration.png';
    const imgSrc = illustrationSrc || defaultIllustration;

    const fullName = identity?.name ?? 'Guru LMS';
    const firstName = fullName.trim().split(' ')[0] || 'Guru';
    const cleanSubject = identity?.extra ? identity.extra.replace(/^Mengajar:\s*/i, '').trim() : '';

    // Dynamic greeting based on current local hour
    const hour = new Date().getHours();
    const greetingTime = hour < 11 ? 'Pagi' : hour < 15 ? 'Siang' : hour < 18 ? 'Sore' : 'Malam';

    // Indonesian formatted date
    const formattedDate = useMemo(() => {
        if (dateText && todayName) {
            return `${todayName}, ${dateText}`;
        }
        return new Date().toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    }, [dateText, todayName]);

    // Format Academic Year & Semester
    const semName = identity?.semester
        ? identity.semester.toLowerCase().includes('ganjil')
            ? 'Semester Ganjil'
            : identity.semester.toLowerCase().includes('genap')
            ? 'Semester Genap'
            : identity.semester
        : null;

    const periodText = [identity?.tahunAjaran, semName].filter(Boolean).join(' • ');

    return (
        <div
            className={`group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary via-indigo-600 to-violet-800 dark:from-primary/95 dark:via-indigo-950 dark:to-slate-900 border border-white/20 dark:border-white/10 p-5 sm:p-6 lg:p-7 text-white shadow-xl shadow-indigo-950/15 w-full min-w-0 box-border transition-all ${className}`}
        >
            {/* ── Ambient Decorative Lights & Geometric Pattern ── */}
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-indigo-300/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 -right-12 -translate-y-1/2 w-80 h-80 bg-violet-400/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

            {/* ── Main Banner Content ── */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-center w-full min-w-0">
                
                {/* Left & Center Information Column */}
                <div className="lg:col-span-8 xl:col-span-9 space-y-3.5 sm:space-y-4 min-w-0">
                    
                    {/* Top Row: Greeting & Live Date Chip */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/25 text-xs font-bold text-white shadow-xs">
                            <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                            <span>Selamat {greetingTime}, {firstName}!</span>
                            <span className="inline-block animate-wave origin-[70%_70%]">👋</span>
                        </div>

                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 backdrop-blur-md border border-white/15 text-xs font-medium text-white/90">
                            <Clock className="h-3 w-3 text-white/70" />
                            <span>{formattedDate}</span>
                        </div>
                    </div>

                    {/* Teacher Identity & Title */}
                    <div className="space-y-1 sm:space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight">
                                {fullName}
                            </h1>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[11px] font-bold tracking-wide text-white shrink-0 shadow-xs">
                                <ShieldCheck className="h-3 w-3 text-emerald-300" />
                                {roleLabelMap[userRole] ?? userRole}
                            </span>
                        </div>

                        <p className="text-xs sm:text-sm text-white/85 font-medium leading-relaxed max-w-2xl">
                            Selamat datang kembali di ruang kerja digital LMS Mokopani. Pantau aktivitas kelas, kelola bahan ajar, dan optimalkan capaian asesmen siswa hari ini.
                        </p>
                    </div>

                    {/* Context Meta Badges (Mapel, Sekolah, Periode) */}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                        {cleanSubject && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-white font-semibold shadow-xs">
                                <BookOpen className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                                <span className="truncate max-w-[200px]">{cleanSubject}</span>
                            </div>
                        )}

                        {identity?.sekolah && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-white font-semibold shadow-xs">
                                <School className="h-3.5 w-3.5 text-blue-200 shrink-0" />
                                <span className="truncate max-w-[220px]">{identity.sekolah}</span>
                            </div>
                        )}

                        {periodText && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-white/95 font-medium shadow-xs">
                                <Calendar className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                                <span className="truncate">{periodText}</span>
                            </div>
                        )}
                    </div>

                    {/* Quick Access CTA Buttons (Solves the empty void & adds high utility) */}
                    <div className="flex flex-wrap items-center gap-2.5 pt-2">
                        <Link
                            href="/gradebook"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-primary font-bold text-xs shadow-md hover:bg-white/95 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
                        >
                            <Award className="h-3.5 w-3.5 text-primary" />
                            <span>Buku Nilai & Rapor</span>
                            <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
                        </Link>

                        <Link
                            href="/assignments/create"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-md border border-white/30 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
                        >
                            <Plus className="h-3.5 w-3.5 text-white" />
                            <span>Buat Asesmen Baru</span>
                        </Link>
                    </div>

                </div>

                {/* Right Illustration Column */}
                <div className="lg:col-span-4 xl:col-span-3 hidden sm:flex sm:justify-end sm:items-end relative h-full min-h-[140px] pointer-events-none">
                    {/* Subtle pedestal aura */}
                    <div className="absolute bottom-0 right-4 w-36 h-8 bg-black/25 rounded-full blur-md" />
                    <img
                        src={imgSrc}
                        alt="Ilustrasi Guru"
                        className="relative z-10 h-36 sm:h-44 lg:h-52 w-auto object-contain object-bottom drop-shadow-2xl translate-y-2 -scale-x-100"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                </div>

            </div>
        </div>
    );
}
