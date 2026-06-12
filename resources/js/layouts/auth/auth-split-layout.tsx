import AppLogoIcon from '@/components/app-logo-icon';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';

interface AuthLayoutProps {
    children: React.ReactNode;
    title?: string;
    description?: string;
}

export default function AuthSplitLayout({ children, title, description }: AuthLayoutProps) {
    const { name, school_name, school_logo } = usePage<SharedData>().props;

    return (
        <div className="authentication-wrapper authentication-cover flex min-h-svh">
            <Link href={route('home')} className="app-brand auth-cover-brand fixed left-6 top-5 z-50 flex items-center gap-2 font-medium group">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg shadow-sm overflow-hidden border border-white/20 bg-white/10 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <AppLogoIcon className="size-full object-cover" />
                </div>
                <span className="text-base font-semibold text-white drop-shadow-md hidden sm:inline transition-colors duration-300">{name}</span>
            </Link>

            <div className="flex w-full h-svh">
                {/* Left: Illustration */}
                <div className="hidden lg:flex flex-col lg:w-[50%] xl:w-[60%] relative overflow-hidden group">
                    <img src="/login-bg.png?v=4" alt="Siswa SMP Belajar di Taman" className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-[20s] ease-linear group-hover:scale-110" />
                    {/* Gradient Overlay for Text Visibility (Dark at top & bottom, clear in middle) */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none" />
                    
                    {/* Bottom: Slogan */}
                    <div className="relative z-10 flex flex-1 flex-col justify-end p-10 pb-16 text-left animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                        <h2 className="text-3xl font-bold text-white drop-shadow-lg">
                            LMS (Learning Management Sistem) Mokopani
                        </h2>
                        <p className="mt-3 text-base text-white/90 max-w-lg drop-shadow-md">
                            Platform digital untuk mendukung proses belajar mengajar yang lebih efektif, terstruktur, dan terukur.
                        </p>
                    </div>
                </div>

                {/* Right: Form */}
                <div className="flex w-full lg:w-[50%] xl:w-[40%] items-center justify-center bg-background p-8 sm:p-12">
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
