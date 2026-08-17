import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType, type SharedData } from '@/types';
import { Link, usePage, router } from '@inertiajs/react';
import AppearanceToggleDropdown from './appearance-dropdown';
import NotificationBell from './notification-bell';
import AppLogo from './app-logo';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, ArrowLeft, Calendar } from 'lucide-react';
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
        .slice(0, 2);

    const activeSemester = semestersList?.find(s => s.id === activeSemesterId);
    // Full label: "Ganjil (2026/2027)"
    const activeSemesterFull = activeSemester
        ? `${activeSemester.name}${activeSemester.academic_year ? ` (${activeSemester.academic_year})` : ''}`
        : 'Pilih Semester';
    // Compact label: "Ganjil 26/27"
    const activeSemesterCompact = activeSemester
        ? `${activeSemester.name}${activeSemester.academic_year ? ` ${activeSemester.academic_year.replace(/(\d{2})\d{2}\/(\d{2})\d{2}/, '$1/$2')}` : ''}`
        : 'Semester';

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
        <header className="sticky top-0 z-30 flex h-14 md:h-14 shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-card/95 backdrop-blur-md px-3 md:px-5 shadow-xs transition-all">

            {/* ── Left: sidebar trigger + breadcrumbs / mobile logo & back ── */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Desktop Sidebar Trigger */}
                <SidebarTrigger className="text-sidebar-foreground hover:bg-muted/80 transition hidden md:flex shrink-0 h-9 w-9 rounded-lg" />

                {/* Desktop breadcrumbs */}
                <div className="hidden md:flex min-w-0">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>

                {/* Mobile: Back button if nested, or Logo if at root */}
                <div className="md:hidden flex items-center gap-1.5 min-w-0">
                    {hasBackHistory ? (
                        <div className="flex items-center gap-2 min-w-0">
                            {prevBreadcrumb?.href ? (
                                <Link
                                    href={prevBreadcrumb.href}
                                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/60 text-foreground active:scale-95 transition-transform"
                                    aria-label="Kembali"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => window.history.back()}
                                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/60 text-foreground active:scale-95 transition-transform"
                                    aria-label="Kembali"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </button>
                            )}
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-bold text-foreground truncate max-w-[140px] xs:max-w-[180px]">
                                    {breadcrumbs[breadcrumbs.length - 1]?.title}
                                </span>
                                {prevBreadcrumb && (
                                    <span className="text-[10px] text-muted-foreground truncate leading-tight">
                                        {prevBreadcrumb.title}
                                    </span>
                                )}
                            </div>
                        </div>
                    ) : (
                        <Link href="/dashboard" className="flex items-center gap-2">
                            <AppLogo />
                        </Link>
                    )}
                </div>
            </div>

            {/* ── Right: semester + theme/notif controls + user ── */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

                {/* Semester dropdown (Desktop & Mobile) */}
                {semestersList && semestersList.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className="flex h-8 items-center gap-1 border-border/60 bg-muted/40 px-2 sm:px-2.5 text-xs font-semibold shadow-none hover:bg-accent/50 hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-ring rounded-lg max-w-[105px] sm:max-w-[155px] lg:max-w-[200px]"
                            >
                                <Calendar className="h-3 w-3 text-primary shrink-0 sm:hidden" />
                                {/* mobile & compact view */}
                                <span className="truncate text-[11px] sm:text-xs">{activeSemester?.name || 'Semester'}</span>
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

                {/* ── User block ── */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <Link
                        href="/profile"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20 shadow-xs text-[11px] font-black hover:bg-primary/20 active:scale-95 transition"
                        title={fullName}
                    >
                        {initials}
                    </Link>

                    {/* Desktop Name + role */}
                    <div className="hidden sm:flex flex-col text-left leading-tight max-w-[120px] md:max-w-[140px] lg:max-w-[200px]">
                        <p className="text-sm font-bold text-foreground truncate leading-none lg:hidden">
                            {shortName}
                        </p>
                        <p className="text-sm font-bold text-foreground truncate leading-none hidden lg:block">
                            {fullName}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 leading-none">
                            {roleLabel}
                        </p>
                    </div>
                </div>
            </div>
        </header>
    );
}
