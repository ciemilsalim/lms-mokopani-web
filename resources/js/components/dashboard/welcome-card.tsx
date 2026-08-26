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

    return (
        <div className={`relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-primary via-primary/95 to-indigo-700 p-5 sm:p-6 text-primary-foreground shadow-md ${className}`}>
            <div className="relative z-10 flex items-center justify-between">
                <div className="min-w-0 flex-1 pr-2 sm:pr-40">
                    <p className="text-xs sm:text-sm font-medium text-white/80">
                        Selamat datang kembali,
                    </p>

                    <h1 className="mt-1 text-xl sm:text-2xl font-black flex flex-wrap items-center gap-2 tracking-tight">
                        <span className="truncate">{identity?.name ?? 'Pengguna'}</span>
                        <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold tracking-wide backdrop-blur-xs">
                            {roleLabelMap[userRole] ?? userRole}
                        </span>
                    </h1>

                    {identity ? (
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-white/90">
                            {identity.idLabel && identity.idValue && (
                                <span className="bg-black/20 px-2 py-0.5 rounded-md font-mono font-semibold text-[11px]">
                                    {identity.idLabel}: {identity.idValue}
                                </span>
                            )}
                            {identity.extra && (
                                <span className="bg-white/15 px-2 py-0.5 rounded-md font-medium text-[11px]">
                                    {identity.extra}
                                </span>
                            )}
                            <span className="text-white/85 text-[11px]">{identity.sekolah}</span>
                            {identity.tahunAjaran && (
                                <>
                                    <span className="hidden sm:inline text-white/40">•</span>
                                    <span className="text-white/85 text-[11px]">
                                        {identity.tahunAjaran} {identity.semester ? `(${identity.semester})` : ''}
                                    </span>
                                </>
                            )}
                        </div>
                    ) : (
                        <p className="mt-1 text-xs text-white/80">
                            Pantau aktivitas dan progres pembelajaran hari ini
                        </p>
                    )}
                </div>
            </div>

            {/* Pop-out Illustration on Desktop/Tablet */}
            <div className="hidden sm:block absolute right-6 bottom-0 z-20 pointer-events-none">
                <img
                    src={imgSrc}
                    alt="Ilustrasi Profile"
                    className="h-40 sm:h-44 w-auto object-contain object-bottom drop-shadow-xl translate-y-1 -scale-x-100"
                    onError={(e) => {
                        // Fallback gracefully if image asset does not exist
                        e.currentTarget.style.display = 'none';
                    }}
                />
            </div>
        </div>
    );
}
