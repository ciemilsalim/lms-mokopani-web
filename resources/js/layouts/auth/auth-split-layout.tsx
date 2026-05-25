import AppLogoIcon from '@/components/app-logo-icon';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';

interface AuthLayoutProps {
    children: React.ReactNode;
    title?: string;
    description?: string;
}

export default function AuthSplitLayout({ children, title, description }: AuthLayoutProps) {
    const { name } = usePage<SharedData>().props;

    return (
        <div className="authentication-wrapper authentication-cover flex min-h-svh">
            <Link href={route('home')} className="app-brand auth-cover-brand fixed left-6 top-5 z-50 flex items-center gap-2 font-medium">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm">
                    <AppLogoIcon className="size-5 fill-current text-primary-foreground" />
                </div>
                <span className="text-base font-semibold text-foreground hidden sm:inline">{name}</span>
            </Link>

            <div className="flex w-full">
                {/* Left: Illustration */}
                <div className="hidden xl:flex xl:w-[62%] items-center justify-center bg-sidebar p-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-sidebar/80 via-sidebar to-sidebar-accent/30" />
                    <div className="relative z-10 flex flex-col items-center text-center max-w-lg">
                        <svg viewBox="0 0 320 260" fill="none" className="w-full max-w-sm" xmlns="http://www.w3.org/2000/svg">
                            <path d="M160 20L280 80V200L160 260L40 200V80L160 20Z" fill="url(#grad1)" fillOpacity="0.2" />
                            <path d="M160 40L260 90V190L160 240L60 190V90L160 40Z" stroke="url(#grad1)" strokeWidth="1.5" fill="none" />
                            <path d="M160 60L240 100V180L160 220L80 180V100L160 60Z" fill="url(#grad1)" fillOpacity="0.15" />
                            <circle cx="160" cy="140" r="45" fill="url(#grad1)" fillOpacity="0.25" />
                            <circle cx="160" cy="140" r="28" fill="url(#grad1)" fillOpacity="0.35" />
                            <path d="M160 100V140L185 155" stroke="url(#grad1)" strokeWidth="3" strokeLinecap="round" />
                            <circle cx="160" cy="140" r="50" stroke="url(#grad1)" strokeWidth="1" strokeDasharray="4 4" fill="none" />
                            <defs>
                                <linearGradient id="grad1" x1="80" y1="20" x2="240" y2="260" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#7367f0" />
                                    <stop offset="1" stopColor="#9e95f5" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <h2 className="mt-6 text-xl font-semibold text-sidebar-primary-foreground">
                            Sistem Manajemen Pembelajaran
                        </h2>
                        <p className="mt-2 text-sm text-sidebar-foreground max-w-sm">
                            Platform digital untuk mendukung proses belajar mengajar yang lebih efektif, terstruktur, dan terukur.
                        </p>
                    </div>
                </div>

                {/* Right: Form */}
                <div className="flex w-full xl:w-[38%] items-center justify-center bg-background p-6 sm:p-12">
                    <div className="flex h-full w-full max-w-sm mx-auto flex-col">
                        <div className="flex-1">
                            {title && (
                                <div className="mb-8">
                                    <h4 className="text-xl font-semibold text-foreground">{title}</h4>
                                    {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
                                </div>
                            )}
                            {children}
                        </div>
                        <p className="mt-8 text-center text-[10px] text-muted-foreground/60">
                            Created By Zahradev &middot; LMS Mokopani Versi 1.0
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
