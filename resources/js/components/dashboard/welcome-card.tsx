import React, { useMemo } from 'react';
import {
    BookOpen,
    School,
    Calendar,
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
    teacher: 'Guru',
    student: 'Siswa',
    parent: 'Orang Tua',
    user: 'Pengguna',
};

/**
 * WelcomeCard
 * Clean, simple, and focused hero banner for the dashboard.
 * Designed with balanced whitespace, clear typography hierarchy, and full responsiveness.
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
            ? 'Ganjil'
            : identity.semester.toLowerCase().includes('genap')
            ? 'Genap'
            : identity.semester
        : null;

    const periodText = [identity?.tahunAjaran, semName].filter(Boolean).join(' • ');

    return (
        <div
            className={`relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-primary via-indigo-600 to-indigo-700 dark:from-primary/95 dark:via-indigo-950 dark:to-slate-900 border border-white/20 dark:border-white/10 py-6 sm:py-7 lg:py-8 px-5 sm:px-7 lg:px-8 text-white shadow-lg shadow-indigo-950/10 w-full min-w-0 box-border ${className}`}
        >
            {/* Subtle soft ambient light */}
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 right-1/3 w-80 h-80 bg-violet-400/15 rounded-full blur-3xl pointer-events-none" />

            {/* Main Content Area */}
            <div className="relative z-10 max-w-3xl pr-0 sm:pr-44 lg:pr-56 space-y-3">
                
                {/* Greeting & Date */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs sm:text-sm text-white/85 font-medium">
                    <span className="inline-flex items-center gap-1.5 text-white font-semibold">
                        Selamat {greetingTime}, {firstName}
                        <span className="inline-block animate-wave origin-[70%_70%]">👋</span>
                    </span>
                    <span className="text-white/40">•</span>
                    <span className="inline-flex items-center gap-1.5 text-white/75 text-xs">
                        <Clock className="h-3 w-3 opacity-70" />
                        <span>{formattedDate}</span>
                    </span>
                </div>

                {/* Identity Name & Role Badge */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight">
                        {fullName}
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/25 text-[11px] font-semibold text-white tracking-wide shrink-0">
                        <ShieldCheck className="h-3 w-3 text-emerald-300" />
                        {roleLabelMap[userRole] ?? userRole}
                    </span>
                </div>

                {/* Context Metadata (Mapel, Sekolah, Periode) */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    {cleanSubject && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 text-white font-semibold shadow-xs">
                            <BookOpen className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                            <span className="truncate max-w-[200px]">{cleanSubject}</span>
                        </div>
                    )}

                    {identity?.sekolah && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 text-white font-medium shadow-xs">
                            <School className="h-3.5 w-3.5 text-blue-200 shrink-0" />
                            <span className="truncate max-w-[240px]">{identity.sekolah}</span>
                        </div>
                    )}

                    {periodText && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 text-white/90 font-medium shadow-xs">
                            <Calendar className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                            <span>{periodText}</span>
                        </div>
                    )}
                </div>

            </div>

            {/* Illustration on Right Side (Desktop & Tablet) */}
            <div className="hidden sm:block absolute right-4 lg:right-8 bottom-0 z-10 pointer-events-none">
                <img
                    src={imgSrc}
                    alt="Ilustrasi Guru"
                    className="h-32 sm:h-36 lg:h-40 w-auto object-contain object-bottom drop-shadow-xl translate-y-1 -scale-x-100"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                    }}
                />
            </div>
        </div>
    );
}
