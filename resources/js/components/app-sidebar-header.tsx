import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import AppearanceToggleDropdown from './appearance-dropdown';
import NotificationBell from './notification-bell';
import AppLogo from './app-logo';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const { auth, user_role, school_name, semestersList, activeSemesterId } = usePage<SharedData>().props;
    const initials = (auth?.user?.name ?? '')
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const activeSemester = semestersList?.find(s => s.id === activeSemesterId);
    const activeSemesterName = activeSemester ? `${activeSemester.name} ${activeSemester.academic_year ? `(${activeSemester.academic_year})` : ''}` : 'Pilih Semester';

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
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-border/60 bg-card px-4 md:px-6 shadow-sm">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="text-sidebar-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition hidden md:flex" />
                <div className="hidden md:flex">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>
                {/* Mobile Logo & App Name */}
                <div className="md:hidden flex items-center gap-2">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <AppLogo />
                    </Link>
                </div>
            </div>

            <div className="ml-auto flex items-center gap-4">
                {/* Semester Switch Dropdown */}
                {semestersList && semestersList.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="hidden lg:flex h-9 items-center justify-between gap-2 border-border/60 bg-transparent px-3 text-sm font-medium shadow-none hover:bg-accent/50 hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-ring">
                                <span className="max-w-[140px] truncate">{activeSemesterName}</span>
                                <ChevronDown className="h-4 w-4 opacity-50" />
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
                                    <span className="truncate">{semester.name} {semester.academic_year ? `(${semester.academic_year})` : ''}</span>
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
                <div className="h-6 w-px bg-border hidden sm:block"></div>
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary border-2 border-primary/20 shadow-sm text-xs font-black">
                        {initials}
                    </div>
                    <div className="hidden sm:block text-left">
                        <p className="text-sm font-bold text-foreground leading-none">{auth?.user?.name}</p>
                        <p className="text-[10px] text-muted-foreground/85 font-semibold mt-0.5 leading-none">{roleLabel}</p>
                    </div>
                </div>
            </div>
        </header>
    );
}
