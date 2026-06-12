import { Breadcrumbs } from '@/components/breadcrumbs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { NavigationMenu, NavigationMenuItem, NavigationMenuList, navigationMenuTriggerStyle } from '@/components/ui/navigation-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { LayoutGrid, Menu, BookOpen, Library, ClipboardList, Target, FileBarChart, Bell, GraduationCap, Compass, BarChart3, Heart } from 'lucide-react';
import AppLogo from './app-logo';
import AppLogoIcon from './app-logo-icon';
import AppearanceToggleDropdown from './appearance-dropdown';
import NotificationBell from './notification-bell';

const mainNavItems: NavItem[] = [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutGrid },
];

// Teacher-specific mobile nav items
const teacherMobileNavItems: NavItem[] = [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutGrid },
    { title: 'Rancang Pembelajaran', url: '/instructional-design/create', icon: Compass },
    { title: 'Tujuan Pembelajaran', url: '/learning-objectives', icon: Target },
    { title: 'Materi', url: '/materials', icon: Library },
    { title: 'Asesmen', url: '/assignments', icon: ClipboardList },
    { title: 'Laporan Nilai', url: '/gradebook', icon: FileBarChart },
    { title: 'Analitik', url: '/analytics', icon: BarChart3 },
    { title: 'Pengumuman', url: '/announcements', icon: Bell },
    { title: 'Siswa', url: '/students', icon: GraduationCap },
];

const studentMobileNavItems: NavItem[] = [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutGrid },
    { title: 'Materi', url: '/materials', icon: Library },
    { title: 'Asesmen', url: '/assignments', icon: ClipboardList },
    { title: 'Pengumuman', url: '/announcements', icon: Bell },
];

const parentMobileNavItems: NavItem[] = [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutGrid },
    { title: 'Anak Saya', url: '/parent/dashboard', icon: Heart },
];

const activeItemStyles = 'text-[#1B1B25] dark:bg-[#1F1F2E] dark:text-[#F1F1F4]';

interface AppHeaderProps {
    breadcrumbs?: BreadcrumbItem[];
}

export function AppHeader({ breadcrumbs = [] }: AppHeaderProps) {
    const page = usePage<SharedData>();
    const { auth, user_role } = page.props;
    const getInitials = useInitials();

    const mobileItems = user_role === 'teacher' ? teacherMobileNavItems : user_role === 'parent' ? parentMobileNavItems : studentMobileNavItems;

    return (
        <>
            <div className="border-sidebar-border/80 border-b">
                <div className="mx-auto flex h-16 items-center px-6 md:max-w-7xl">
                    {/* Mobile Menu */}
                    <div className="lg:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="mr-2 h-[34px] w-[34px]">
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="flex h-full w-64 flex-col items-stretch justify-between bg-sidebar">
                                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                                <SheetHeader className="flex justify-start text-left">
                                    <AppLogoIcon className="h-8 w-8 object-cover rounded-lg border border-border shadow-sm" />
                                </SheetHeader>
                                <div className="mt-6 flex h-full flex-1 flex-col space-y-4">
                                    <div className="flex h-full flex-col justify-between text-sm">
                                        <div className="flex flex-col space-y-1">
                                            {mobileItems.map((item) => {
                                                const Icon = item.icon;
                                                const isItemActive = item.url === '/dashboard'
                                                    ? page.url === '/dashboard'
                                                    : page.url === item.url || page.url.startsWith(item.url + '/');
                                                return (
                                                    <Link
                                                        key={item.title}
                                                        href={item.url || ''}
                                                        className={cn(
                                                            'flex items-center space-x-3 rounded-lg px-3 py-2.5 font-medium transition-colors',
                                                            isItemActive
                                                                ? 'bg-[#5E6AD2]/10 text-[#5E6AD2] dark:bg-[#1F1F2E] dark:text-[#F1F1F4]'
                                                                : 'text-[#8A8F98] hover:bg-[#F1F1F4]/50 dark:text-[#8A8F98] dark:hover:bg-[#1F1F2E]'
                                                        )}
                                                    >
                                                        {Icon && <Icon className="h-5 w-5" />}
                                                        <span>{item.title}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>

                    <Link href="/dashboard" prefetch className="flex items-center space-x-2">
                        <AppLogo />
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="ml-6 hidden h-full items-center space-x-6 lg:flex">
                        <NavigationMenu className="flex h-full items-stretch">
                            <NavigationMenuList className="flex h-full items-stretch space-x-2">
                                {mainNavItems.map((item, index) => (
                                    <NavigationMenuItem key={index} className="relative flex h-full items-center">
                                        <Link
                                            href={item.url || ''}
                                            className={cn(
                                                navigationMenuTriggerStyle(),
                                                page.url === item.url && activeItemStyles,
                                                'h-9 cursor-pointer px-3',
                                            )}
                                        >
                                            {item.title}
                                        </Link>
                                        {page.url === item.url && (
                                            <div className="absolute bottom-0 left-0 h-0.5 w-full translate-y-px bg-black dark:bg-white"></div>
                                        )}
                                    </NavigationMenuItem>
                                ))}
                            </NavigationMenuList>
                        </NavigationMenu>
                    </div>

                    <div className="ml-auto flex items-center space-x-1">
                        <NotificationBell />
                        <AppearanceToggleDropdown />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="size-10 rounded-full p-1">
                                    <Avatar className="size-8 overflow-hidden rounded-full">
                                        <AvatarImage src={auth.user.avatar} alt={auth.user.name} />
                                        <AvatarFallback className="rounded-full bg-[#5E6AD2]/10 text-[#5E6AD2] dark:bg-[#2C2C3A] dark:text-[#F1F1F4]">
                                            {getInitials(auth.user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end">
                                <UserMenuContent user={auth.user} />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
            {breadcrumbs.length > 1 && (
                <div className="border-sidebar-border/70 flex w-full border-b">
                    <div className="mx-auto flex h-12 w-full items-center justify-start px-4 text-neutral-500 md:max-w-7xl">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                </div>
            )}
        </>
    );
}
