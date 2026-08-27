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
            <div className="relative z-10 flex items-start justify-between">
                <div className="min-w-0 flex-1 pr-0 sm:pr-40">
                    <p className="text-xs font-medium text-white/80">
                        Selamat datang kembali,
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                            {identity?.name ?? 'Pengguna'}
                        </h1>
                        <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold tracking-wide backdrop-blur-xs text-white">
                            {roleLabelMap[userRole] ?? userRole}
                        </span>
                    </div>

                    {identity ? (
                        <div className="mt-3 flex flex-col gap-1.5 text-xs text-white/90">
                            {/* NIP / ID Row */}
                            {identity.idLabel && identity.idValue && (
                                <div className="flex items-center gap-2">
                                    <span className="inline-block bg-black/25 px-2 py-0.5 rounded-md font-mono font-bold text-[11px] text-white tracking-wide">
                                        {identity.idLabel}: {identity.idValue}
                                    </span>
                                </div>
                            )}

                            {/* Extra / Teaching Subject */}
                            {identity.extra && (
                                <div className="flex items-center gap-1.5 text-white/90 text-xs font-medium">
                                    <span className="opacity-80">Mengajar:</span>
                                    <span className="font-bold text-white bg-white/15 px-2 py-0.5 rounded-md text-[11px]">
                                        {identity.extra}
                                    </span>
                                </div>
                            )}

                            {/* School & Period Context */}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-white/80 pt-0.5">
                                <span className="font-semibold text-white/90">{identity.sekolah}</span>
                                {identity.tahunAjaran && (
                                    <>
                                        <span className="text-white/40">•</span>
                                        <span>
                                            {identity.tahunAjaran} {identity.semester ? `(${identity.semester})` : ''}
                                        </span>
                                    </>
                                )}
                            </div>
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
                        e.currentTarget.style.display = 'none';
                    }}
                />
            </div>
        </div>
    );
}
