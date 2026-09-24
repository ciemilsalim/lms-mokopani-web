import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType, type SharedData } from '@/types';
import { Link, usePage, router } from '@inertiajs/react';
import AppearanceToggleDropdown from './appearance-dropdown';
import NotificationBell from './notification-bell';
import AppLogo from './app-logo';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown, ArrowLeft, Calendar, User, LogOut, Library, ClipboardList, FileBarChart } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const { auth, user_role, semestersList, activeSemesterId } = usePage<SharedData>().props;

    const fullName = auth?.user?.name ?? '';
    const nameParts = fullName.trim().split(' ');
    // Short display name: first name + last name initial (e.g. "Velyca L.")
    const shortName = nameParts.length > 1
        ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
        : nameParts[0] || '';

    const initials = nameParts
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U';

    // Student identity details
    const studentData = (auth?.user as any)?.student;
    const studentClass = studentData?.school_class?.name || studentData?.schoolClass?.name;
    const studentNis = studentData?.nis;
    const studentPhoto = studentData?.photo_url || studentData?.photo;
    const userAvatar = auth?.user?.avatar || auth?.user?.avatar_url || studentPhoto || '';

    const activeSemester = semestersList?.find(s => s.id === activeSemesterId);

    const switchSemester = (id: number) => {
        router.post(route('academic-periods.switch'), { semester_id: id }, {
            preserveScroll: true
        });
    };

    const roleLabels: Record<string, string> = {
        admin: 'Admin',
        teacher: 'Guru',
        student: 'Siswa',
        parent: 'Orang Tua',
    };
    const roleLabel = roleLabels[user_role] || 'Pengguna';

    const hasBackHistory = breadcrumbs.length > 1;
    const prevBreadcrumb = hasBackHistory ? breadcrumbs[breadcrumbs.length - 2] : null;

    return (
        <header className="sticky top-0 z-30 flex h-14 md:h-14 w-full max-w-full shrink-0 items-center justify-between gap-1.5 sm:gap-2 border-b border-border/60 bg-card/95 backdrop-blur-md px-2.5 sm:px-4 shadow-xs transition-all">

            {/* ── Left: sidebar trigger + breadcrumbs / mobile logo & back ── */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                {/* Desktop Sidebar Trigger */}
                <SidebarTrigger className="text-sidebar-foreground hover:bg-muted/80 transition hidden md:flex shrink-0 h-9 w-9 rounded-lg" />

                {/* Desktop breadcrumbs */}
                <div className="hidden md:flex min-w-0">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>

                {/* Mobile: Back button if nested, or Logo if at root */}
                <div className="md:hidden flex items-center gap-1.5 min-w-0">
                    {hasBackHistory ? (
                        <div className="flex items-center gap-1.5 min-w-0">
                            {prevBreadcrumb?.href && prevBreadcrumb.href !== '#' ? (
                                <Link
                                    href={prevBreadcrumb.href}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-foreground active:scale-95 transition-transform"
                                    aria-label="Kembali"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => window.history.length > 1 ? window.history.back() : router.visit('/dashboard')}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-foreground active:scale-95 transition-transform"
                                    aria-label="Kembali"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </button>
                            )}
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs sm:text-sm font-bold text-foreground truncate max-w-[110px] xs:max-w-[150px] sm:max-w-[200px]">
                                    {breadcrumbs[breadcrumbs.length - 1]?.title}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <Link href="/dashboard" className="flex items-center gap-1.5 min-w-0">
                            <AppLogo />
                        </Link>
                    )}
                </div>
            </div>

            {/* ── Right: semester + theme/notif controls + user ── */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">

                {/* Semester dropdown (Desktop & Mobile) */}
                {semestersList && semestersList.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className="flex h-8 items-center gap-1 border-border/60 bg-muted/40 px-1.5 sm:px-2.5 text-xs font-semibold shadow-none hover:bg-accent/50 hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-ring rounded-lg max-w-[80px] xs:max-w-[115px] sm:max-w-[160px] lg:max-w-[210px] shrink-0"
                            >
                                <Calendar className="h-3.5 w-3.5 text-primary shrink-0 hidden xs:inline" />
                                <span className="truncate text-[10px] sm:text-xs">
                                    {activeSemester ? activeSemester.name.replace(/Semester\s*/i, 'Sem. ') : 'Semester'}
                                </span>
                                <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[240px] rounded-xl shadow-lg">
                            <div className="px-3 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/40">
                                Pilih Periode Akademik
                            </div>
                            <div className="p-1 space-y-1">
                                {semestersList.map(semester => (
                                    <DropdownMenuItem
                                        key={semester.id}
                                        onClick={() => switchSemester(semester.id)}
                                        className={cn(
                                            "cursor-pointer justify-between rounded-lg px-2.5 py-2 text-xs",
                                            semester.id === activeSemesterId && "bg-primary/10 text-primary font-bold"
                                        )}
                                    >
                                        <span className="truncate font-medium">{semester.name} {semester.academic_year ? `(${semester.academic_year})` : ''}</span>
                                        {semester.is_active && (
                                            <span className="ml-1.5 inline-flex items-center rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                                Aktif
                                            </span>
                                        )}
                                    </DropdownMenuItem>
                                ))}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                <AppearanceToggleDropdown />
                <NotificationBell />
                <div className="h-5 w-px bg-border/70 hidden sm:block shrink-0" />

                {/* ── User Profile Dropdown ── */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className="flex items-center gap-1.5 sm:gap-2 rounded-xl p-1 sm:px-2 sm:py-1 hover:bg-muted/70 active:scale-98 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shrink-0 text-left"
                            title={fullName}
                            aria-label="Menu Pengguna"
                        >
                            <Avatar className="h-8 w-8 overflow-hidden rounded-full border border-primary/25 shadow-xs shrink-0">
                                <AvatarImage src={userAvatar} alt={fullName} className="object-cover" />
                                <AvatarFallback className="rounded-full bg-primary/10 text-primary font-black text-[11px]">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>

                            {/* Desktop Name + role / class */}
                            <div className="hidden sm:flex flex-col text-left leading-tight max-w-[120px] md:max-w-[140px] lg:max-w-[180px]">
                                <p className="text-xs font-bold text-foreground truncate leading-none lg:hidden">
                                    {shortName}
                                </p>
                                <p className="text-xs font-bold text-foreground truncate leading-none hidden lg:block">
                                    {fullName}
                                </p>
                                <div className="text-[10px] text-muted-foreground font-medium mt-0.5 leading-none flex items-center gap-1 truncate">
                                    {user_role === 'student' ? (
                                        <>
                                            <span className="inline-flex items-center rounded bg-emerald-500/10 px-1 py-0.2 text-[9px] font-bold text-emerald-600">
                                                Siswa
                                            </span>
                                            {studentClass && (
                                                <span className="truncate text-foreground/75 font-semibold">{studentClass}</span>
                                            )}
                                        </>
                                    ) : (
                                        <span>{roleLabel}</span>
                                    )}
                                </div>
                            </div>
                            <ChevronDown className="h-3 w-3 text-muted-foreground/60 hidden sm:block shrink-0" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[230px] rounded-xl shadow-lg p-1.5">
                        {/* Header Info */}
                        <div className="px-2.5 py-2 border-b border-border/50">
                            <p className="text-xs font-bold text-foreground truncate">{fullName}</p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className={cn(
                                    "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                    user_role === 'student' 
                                        ? "bg-emerald-500/10 text-emerald-600" 
                                        : "bg-primary/10 text-primary"
                                )}>
                                    {roleLabel}
                                </span>
                                {user_role === 'student' && studentClass && (
                                    <span className="text-[10px] font-semibold text-muted-foreground">
                                        Kelas {studentClass}
                                    </span>
                                )}
                                {user_role === 'student' && studentNis && (
                                    <span className="text-[10px] font-mono text-muted-foreground">
                                        NIS: {studentNis}
                                    </span>
                                )}
                            </div>
                            {auth?.user?.email && (
                                <p className="text-[11px] text-muted-foreground truncate mt-1">{auth.user.email}</p>
                            )}
                        </div>

                        {/* Navigation Options */}
                        <div className="py-1 space-y-0.5">
                            <DropdownMenuItem asChild className="rounded-lg text-xs font-medium cursor-pointer">
                                <Link href="/profile" className="flex items-center gap-2 px-2.5 py-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span>Profil & Akun Saya</span>
                                </Link>
                            </DropdownMenuItem>

                            {user_role === 'student' && (
                                <>
                                    <DropdownMenuItem asChild className="rounded-lg text-xs font-medium cursor-pointer">
                                        <Link href="/materials" className="flex items-center gap-2 px-2.5 py-2">
                                            <Library className="h-4 w-4 text-muted-foreground" />
                                            <span>Materi Belajar</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild className="rounded-lg text-xs font-medium cursor-pointer">
                                        <Link href="/assignments" className="flex items-center gap-2 px-2.5 py-2">
                                            <ClipboardList className="h-4 w-4 text-muted-foreground" />
                                            <span>Asesmen & Tugas</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild className="rounded-lg text-xs font-medium cursor-pointer">
                                        <Link href="/gradebook" className="flex items-center gap-2 px-2.5 py-2">
                                            <FileBarChart className="h-4 w-4 text-muted-foreground" />
                                            <span>Hasil Belajar & Rapor</span>
                                        </Link>
                                    </DropdownMenuItem>
                                </>
                            )}
                        </div>

                        <div className="pt-1 border-t border-border/50">
                            <DropdownMenuItem asChild className="rounded-lg text-xs font-medium text-rose-600 focus:text-rose-600 focus:bg-rose-500/10 cursor-pointer">
                                <Link href="/logout" method="post" as="button" className="w-full flex items-center gap-2 px-2.5 py-2 text-left">
                                    <LogOut className="h-4 w-4" />
                                    <span>Keluar / Log Out</span>
                                </Link>
                            </DropdownMenuItem>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
