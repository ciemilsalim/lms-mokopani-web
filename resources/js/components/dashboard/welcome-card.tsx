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
 * Pixel-perfect Mobile-First welcome card matching the exact specification (~148px height, 20px radius, 16px padding).
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

    // Format Academic Year & Semester e.g., "2026/2027 · Ganjil"
    const periodText = [
        identity?.tahunAjaran,
        identity?.semester ? (identity.semester.toLowerCase().includes('ganjil') ? 'Ganjil' : identity.semester.toLowerCase().includes('genap') ? 'Genap' : identity.semester) : null
    ].filter(Boolean).join(' · ');

    return (
        <div className={`relative overflow-hidden rounded-[20px] bg-gradient-to-br from-primary via-primary/95 to-indigo-700 p-4 text-primary-foreground shadow-xs min-h-[140px] sm:min-h-[148px] flex flex-col justify-between w-full min-w-0 box-border ${className}`}>
            <div className="relative z-10 flex items-start justify-between w-full min-w-0">
                <div className="min-w-0 flex-1 pr-0 sm:pr-36 space-y-1">
                    {/* Greeting: 11-12px / 500 */}
                    <p className="text-xs font-medium text-white/80 flex items-center gap-1.5 leading-none">
                        <span>Selamat {greetingTime}, {firstName}</span>
                        <span className="inline-block animate-wave origin-[70%_70%]">👋</span>
                    </p>

                    {/* Name: 20px / 700 + Badge Guru: 11px / 700 */}
                    <div className="pt-0.5 flex flex-wrap items-center gap-2 min-w-0">
                        <h1 className="text-lg sm:text-[20px] font-bold tracking-tight text-white leading-tight truncate max-w-full">
                            {identity?.name ?? 'Pengguna'}
                        </h1>
                        <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold tracking-wide backdrop-blur-xs text-white shrink-0">
                            {roleLabelMap[userRole] ?? userRole}
                        </span>
                    </div>

                    {/* Mapel & Sekolah: 12px / 600 & 500 */}
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-white/90 leading-tight">
                        {cleanSubject && (
                            <span className="font-semibold text-white truncate max-w-[180px]">
                                {cleanSubject}
                            </span>
                        )}
                        {cleanSubject && identity?.sekolah && (
                            <span className="text-white/40">•</span>
                        )}
                        {identity?.sekolah && (
                            <span className="text-white/80 font-medium truncate max-w-[200px]">{identity.sekolah}</span>
                        )}
                    </div>

                    {/* Tahun ajaran & Semester: 11-12px / 500 */}
                    {periodText && (
                        <p className="text-[11px] sm:text-xs font-medium text-white/70 pt-0.5 leading-tight truncate">
                            {periodText}
                        </p>
                    )}
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
