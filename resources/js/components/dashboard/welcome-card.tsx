import React from 'react';
import { Badge } from '@/components/ui/badge';

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
 * Reusable Mobile-First welcome and profile identity header banner.
 * Features calm gradient visual, responsive hierarchy, and clean typography.
 */
export function WelcomeCard({
    identity,
    userRole = 'teacher',
    illustrationSrc,
    className = '',
}: WelcomeCardProps) {
    const defaultIllustration = userRole === 'student' ? '/student-illustration.png' : '/teacher-illustration.png';
    const imgSrc = illustrationSrc || defaultIllustration;

    const firstName = identity?.name ? identity.name.trim().split(' ')[0] : 'Guru';
    const cleanSubject = identity?.extra ? identity.extra.replace(/^Mengajar:\s*/i, '') : '';

    // Dynamic greeting based on current local hour
    const hour = new Date().getHours();
    const greetingTime = hour < 11 ? 'pagi' : hour < 15 ? 'siang' : hour < 18 ? 'sore' : 'malam';

    return (
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/95 to-indigo-700 p-4 sm:p-5 text-primary-foreground shadow-sm ${className}`}>
            <div className="relative z-10 flex items-start justify-between">
                <div className="min-w-0 flex-1 pr-0 sm:pr-36">
                    <p className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                        <span>Selamat {greetingTime}, {firstName}</span>
                        <span className="inline-block animate-wave origin-[70%_70%]">👋</span>
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        <h1 className="text-lg sm:text-xl font-black tracking-tight text-white leading-tight">
                            {identity?.name ?? 'Pengguna'}
                        </h1>
                        <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold tracking-wide backdrop-blur-xs text-white">
                            {roleLabelMap[userRole] ?? userRole}
                        </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/90">
                        {cleanSubject && (
                            <span className="font-semibold text-white">
                                {cleanSubject}
                            </span>
                        )}
                        {cleanSubject && identity?.sekolah && (
                            <span className="text-white/40">•</span>
                        )}
                        {identity?.sekolah && (
                            <span className="text-white/80">{identity.sekolah}</span>
                        )}
                        {identity?.tahunAjaran && (
                            <>
                                <span className="text-white/40">•</span>
                                <span className="text-white/70 text-[11px]">
                                    {identity.tahunAjaran} {identity.semester ? `(${identity.semester})` : ''}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Pop-out Illustration on Desktop/Tablet */}
            <div className="hidden sm:block absolute right-4 bottom-0 z-20 pointer-events-none">
                <img
                    src={imgSrc}
                    alt="Ilustrasi Profile"
                    className="h-28 sm:h-32 w-auto object-contain object-bottom drop-shadow-xl translate-y-1 -scale-x-100"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                    }}
                />
            </div>
        </div>
    );
}
