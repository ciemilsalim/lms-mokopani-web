import React, { useMemo } from 'react';
import {
    BookOpen,
    School,
    Calendar,
    ShieldCheck,
    Clock,
    GraduationCap,
    Users,
    Sparkles,
} from 'lucide-react';

export interface IdentityProps {
    name?: string;
    role?: string;
    idLabel?: string;
    idValue?: string;
    extra?: string;
    sekolah?: string;
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
    showIllustration?: boolean;
}

const roleLabelMap: Record<string, string> = {
    admin: 'Administrator',
    teacher: 'Guru',
    student: 'Siswa',
    parent: 'Orang Tua / Wali',
    user: 'Pengguna',
};

/**
 * WelcomeCard
 * Clean, simple, and focused hero banner for all roles (Teacher, Student, Admin, Parent).
 * Tailored specifically for professional mobile ergonomics: no bulky bubble stacking,
 * crisp typographic hierarchy, and responsive breathing room.
 */
export function WelcomeCard({
    identity,
    userRole = 'teacher',
    illustrationSrc,
    className = '',
    todayName,
    dateText,
    showIllustration = true,
}: WelcomeCardProps) {
    // Resolve illustration based on role if not explicitly provided
    const defaultIllustration = useMemo(() => {
        if (!showIllustration) return undefined;
        if (illustrationSrc) return illustrationSrc;
        if (userRole === 'student') return '/student-illustration.png';
        if (userRole === 'teacher') return '/teacher-illustration.png';
        return undefined;
    }, [userRole, illustrationSrc, showIllustration]);

    const hasIllustration = Boolean(defaultIllustration);

    const fullName = identity?.name ?? 'Pengguna LMS';
    const firstName = fullName.trim().split(' ')[0] || 'Pengguna';

    // Parse role-specific extra info cleanly
    const rawExtra = identity?.extra ?? '';
    const cleanExtra = rawExtra.replace(/^(Mengajar|Kelas):\s*/i, '').trim();
    const isSubject = userRole === 'teacher' || rawExtra.toLowerCase().startsWith('mengajar');
    const isClass = userRole === 'student' || rawExtra.toLowerCase().startsWith('kelas');

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
            className={`relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-primary via-indigo-600 to-indigo-700 dark:from-primary/95 dark:via-indigo-950 dark:to-slate-900 border border-white/20 dark:border-white/10 py-5 sm:py-7 lg:py-8 px-4.5 sm:px-7 lg:px-8 text-white shadow-lg shadow-indigo-950/10 w-full min-w-0 box-border ${className}`}
        >
            {/* Subtle soft ambient light */}
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 right-1/3 w-80 h-80 bg-violet-400/15 rounded-full blur-3xl pointer-events-none" />

            {/* Main Content Area */}
            <div className={`relative z-10 ${hasIllustration ? 'max-w-3xl pr-0 sm:pr-44 lg:pr-56' : 'max-w-4xl pr-0'} space-y-2 sm:space-y-3`}>
                
                {/* Greeting & Date: Clean, unified row */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm text-white/85 font-medium">
                    <span className="inline-flex items-center gap-1 text-white font-semibold">
                        Selamat {greetingTime}, {firstName}
                        <span className="inline-block animate-wave origin-[70%_70%]">👋</span>
                    </span>
                    <span className="text-white/40">•</span>
                    <span className="inline-flex items-center gap-1 text-white/75 text-[11px] sm:text-xs">
                        <Clock className="h-3 w-3 opacity-70 shrink-0" />
                        <span>{formattedDate}</span>
                    </span>
                </div>

                {/* Identity Name & Role Badge: Compact & dignified on mobile */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                    <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold sm:font-extrabold text-white tracking-tight leading-tight">
                        {fullName}
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/25 text-[10px] sm:text-[11px] font-semibold text-white tracking-wide shrink-0">
                        {userRole === 'admin' ? (
                            <ShieldCheck className="h-3 w-3 text-emerald-300" />
                        ) : userRole === 'student' ? (
                            <GraduationCap className="h-3 w-3 text-sky-300" />
                        ) : userRole === 'parent' ? (
                            <Users className="h-3 w-3 text-amber-300" />
                        ) : (
                            <ShieldCheck className="h-3 w-3 text-emerald-300" />
                        )}
                        {roleLabelMap[userRole] ?? userRole}
                    </span>
                </div>

                {/* ── Mobile Layout (<sm): Sleek, Unstacked Typography (No Bulky Bubble Cluster) ── */}
                <div className="sm:hidden pt-0.5 space-y-1.5">
                    {/* Line 1: NIP/ID + Mapel / Extra */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        {identity?.idValue && identity.idValue !== '-' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-black/30 backdrop-blur-xs font-mono text-[10px] font-medium text-white/95 border border-white/10">
                                {identity.idLabel ? `${identity.idLabel}: ` : ''}{identity.idValue}
                            </span>
                        )}
                        {cleanExtra && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/15 backdrop-blur-xs text-[11px] font-semibold text-white border border-white/15">
                                {isSubject && <BookOpen className="h-3 w-3 text-amber-300 shrink-0" />}
                                {isClass && <GraduationCap className="h-3 w-3 text-sky-300 shrink-0" />}
                                <span>{isClass && !cleanExtra.toLowerCase().startsWith('kelas') ? `Kelas ${cleanExtra}` : cleanExtra}</span>
                            </span>
                        )}
                    </div>

                    {/* Line 2: School & Academic Period in clean inline typographic style */}
                    {(identity?.sekolah || periodText) && (
                        <div className="flex items-center gap-1.5 text-[11px] text-white/80 font-medium leading-tight truncate">
                            {identity?.sekolah && (
                                <span className="truncate">{identity.sekolah}</span>
                            )}
                            {identity?.sekolah && periodText && (
                                <span className="text-white/40 shrink-0">•</span>
                            )}
                            {periodText && (
                                <span className="shrink-0 text-white/75">{periodText}</span>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Tablet & Desktop Layout (>=sm): Refined, Crisp Badges ── */}
                <div className="hidden sm:flex flex-wrap items-center gap-2 pt-1 text-xs">
                    {/* 1. ID / NIP / NIS badge if present */}
                    {identity?.idValue && identity.idValue !== '-' && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/25 backdrop-blur-sm border border-white/15 text-white/95 font-mono text-xs font-medium shadow-xs">
                            <span>{identity.idLabel ? `${identity.idLabel}: ` : ''}{identity.idValue}</span>
                        </div>
                    )}

                    {/* 2. Role-specific extra badge (Mapel / Kelas / Role-extra) */}
                    {cleanExtra && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 text-white font-semibold shadow-xs">
                            {isSubject ? (
                                <BookOpen className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                            ) : isClass ? (
                                <GraduationCap className="h-3.5 w-3.5 text-sky-300 shrink-0" />
                            ) : userRole === 'parent' ? (
                                <Users className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                            ) : (
                                <Sparkles className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                            )}
                            <span className="truncate max-w-[220px]">
                                {isClass && !cleanExtra.toLowerCase().startsWith('kelas') ? `Kelas ${cleanExtra}` : cleanExtra}
                            </span>
                        </div>
                    )}

                    {/* 3. Sekolah badge */}
                    {identity?.sekolah && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 text-white font-medium shadow-xs">
                            <School className="h-3.5 w-3.5 text-blue-200 shrink-0" />
                            <span className="truncate max-w-[240px]">{identity.sekolah}</span>
                        </div>
                    )}

                    {/* 4. Periode Akademik badge */}
                    {periodText && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 text-white/90 font-medium shadow-xs">
                            <Calendar className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                            <span>{periodText}</span>
                        </div>
                    )}
                </div>

            </div>

            {/* Illustration on Right Side (Desktop & Tablet) if available */}
            {hasIllustration && (
                <div className="hidden sm:block absolute right-4 lg:right-8 bottom-0 z-10 pointer-events-none">
                    <img
                        src={defaultIllustration}
                        alt="Ilustrasi"
                        className="h-32 sm:h-36 lg:h-40 w-auto object-contain object-bottom drop-shadow-xl translate-y-1 -scale-x-100"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                </div>
            )}
        </div>
    );
}
