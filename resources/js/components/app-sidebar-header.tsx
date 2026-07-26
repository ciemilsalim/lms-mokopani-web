import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import AppearanceToggleDropdown from './appearance-dropdown';
import NotificationBell from './notification-bell';
import AppLogo from './app-logo';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';

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
        admin: 'Administrator',
        teacher: 'Guru',
        student: 'Siswa',
        parent: 'Orang Tua',
    };
    const roleLabel = roleLabels[user_role] || 'Pengguna';

    return (
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-card px-3 md:px-4 shadow-sm">

            {/* ── Left: sidebar trigger + breadcrumbs / mobile logo ── */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <SidebarTrigger className="text-sidebar-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition hidden md:flex shrink-0" />

                {/* Desktop breadcrumbs */}
                <div className="hidden md:flex min-w-0">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>

                {/* Mobile: logo */}
                <div className="md:hidden flex items-center">
                    <Link href="/dashboard" className="flex items-center">
                        <AppLogo />
                    </Link>
                </div>

                {/* Mobile: last breadcrumb as page title */}
                {breadcrumbs.length > 0 && (
                    <div className="md:hidden flex items-center gap-1 min-w-0 ml-2">
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-semibold text-foreground truncate max-w-[110px] xs:max-w-[160px]">
                            {breadcrumbs[breadcrumbs.length - 1]?.title}
                        </span>
                    </div>
                )}
            </div>

            {/* ── Right: semester + controls + user ── */}
            <div className="flex items-center gap-2 shrink-0">

                {/* Semester dropdown */}
                {semestersList && semestersList.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className="hidden sm:flex h-8 items-center gap-1.5 border-border/60 bg-transparent px-2.5 text-xs font-semibold shadow-none hover:bg-accent/50 hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-ring max-w-[130px] md:max-w-[155px] lg:max-w-[200px]"
                            >
                                {/* md and below: compact */}
                                <span className="truncate lg:hidden">{activeSemesterCompact}</span>
                                {/* lg+: full */}
                                <span className="truncate hidden lg:inline">{activeSemesterFull}</span>
                                <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[220px]">
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Pilih Semester
                            </div>
                            {semestersList.map(semester => (
                                <DropdownMenuItem
                                    key={semester.id}
                                    onClick={() => switchSemester(semester.id)}
                                    className={cn(
                                        "cursor-pointer justify-between",
                                        semester.id === activeSemesterId && "bg-accent text-accent-foreground font-semibold"
                                    )}
                                >
                                    <span className="truncate">{semester.name}{semester.academic_year ? ` (${semester.academic_year})` : ''}</span>
                                    {semester.is_active && (
                                        <span className="ml-2 inline-flex items-center rounded-sm bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
                                            Aktif
                                        </span>
                                    )}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                <AppearanceToggleDropdown />
                <NotificationBell />
                <div className="h-5 w-px bg-border/70 hidden sm:block shrink-0" />

                {/* ── User block ── */}
                <div className="flex items-center gap-2">
                    {/* Avatar — always visible */}
                    <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary border-2 border-primary/20 shadow-sm text-[11px] font-black select-none cursor-default"
                        title={fullName}
                    >
                        {initials}
                    </div>

                    {/* Name + role — sm: short name, lg: full name */}
                    <div className="hidden sm:flex flex-col text-left leading-tight max-w-[120px] md:max-w-[140px] lg:max-w-[200px]">
                        {/* sm to md: abbreviated name */}
                        <p className="text-sm font-bold text-foreground truncate leading-none lg:hidden">
                            {shortName}
                        </p>
                        {/* lg+: full name */}
                        <p className="text-sm font-bold text-foreground truncate leading-none hidden lg:block">
                            {fullName}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 leading-none">
                            {roleLabel}
                        </p>
                    </div>

                    {/* Mobile: role label below avatar */}
                    <div className="sm:hidden flex flex-col items-start gap-0">
                        <p className="text-[9px] font-bold text-muted-foreground leading-none">{roleLabel}</p>
                    </div>
                </div>
            </div>
        </header>
    );
}
