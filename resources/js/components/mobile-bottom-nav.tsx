import React, { useState, useMemo } from 'react';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    Menu,
    LogOut,
    Settings,
    Palette,
    CalendarCheck,
    Search,
    LayoutDashboard,
    BookOpen,
    ClipboardList,
    FileSpreadsheet,
    GraduationCap,
    Users,
    UserCheck,
    Sparkles,
    ChevronRight,
    User,
    Compass
} from 'lucide-react';
import { getNavSections } from './app-sidebar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from './ui/sheet';

export function MobileBottomNav() {
    const { auth, user_role, semestersList, activeSemesterId } = usePage<SharedData>().props;
    const [searchQuery, setSearchQuery] = useState('');
    const sections = getNavSections(user_role);

    const activeSemester = semestersList?.find(s => s.id === activeSemesterId);

    // Dynamic Role-based primary nav items (Max 4 items + "Lainnya" = 5 items)
    const primaryNavItems = useMemo(() => {
        switch (user_role) {
            case 'teacher':
                return [
                    { title: 'Beranda', url: '/dashboard', icon: LayoutDashboard },
                    { title: 'Materi', url: '/materials', icon: BookOpen },
                    { title: 'Asesmen', url: '/assignments', icon: ClipboardList },
                    { title: 'Presensi', url: '/sso/presensi', icon: CalendarCheck, isExternal: true },
                ];
            case 'student':
                return [
                    { title: 'Beranda', url: '/dashboard', icon: LayoutDashboard },
                    { title: 'Materi', url: '/materials', icon: BookOpen },
                    { title: 'Tugas', url: '/assignments', icon: ClipboardList },
                    { title: 'Nilai', url: '/gradebook', icon: FileSpreadsheet },
                ];
            case 'admin':
                return [
                    { title: 'Beranda', url: '/dashboard', icon: LayoutDashboard },
                    { title: 'Guru', url: '/teachers', icon: Users },
                    { title: 'Siswa', url: '/students', icon: GraduationCap },
                    { title: 'Presensi', url: '/sso/presensi', icon: CalendarCheck, isExternal: true },
                ];
            case 'parent':
                return [
                    { title: 'Beranda', url: '/dashboard', icon: LayoutDashboard },
                    { title: 'Progres', url: '/parent/dashboard', icon: UserCheck },
                    { title: 'Rapor', url: '/gradebook', icon: FileSpreadsheet },
                ];
            default:
                return [
                    { title: 'Beranda', url: '/dashboard', icon: LayoutDashboard },
                ];
        }
    }, [user_role]);

    // Filtered items for search inside Drawer
    const filteredSections = useMemo(() => {
        if (!searchQuery.trim()) return sections;
        const q = searchQuery.toLowerCase();
        return sections
            .map(sec => ({
                ...sec,
                items: sec.items.filter(it => it.title.toLowerCase().includes(q))
            }))
            .filter(sec => sec.items.length > 0);
    }, [sections, searchQuery]);

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    return (
        <div className="md:hidden print:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border/70 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-8px_24px_rgba(0,0,0,0.3)] pb-safe transition-all">
            <div className="flex h-16 items-center justify-around px-1.5">
                {primaryNavItems.map((item) => {
                    const isDashboard = item.url === '/dashboard' && (currentPath === '/dashboard' || currentPath === '/');
                    const isActive = isDashboard || (item.url !== '/dashboard' && currentPath.startsWith(item.url));

                    if (item.isExternal) {
                        return (
                            <a
                                key={item.title}
                                href={item.url}
                                className="group relative flex flex-col items-center justify-center flex-1 h-full py-1 text-sky-600 dark:text-sky-400 hover:text-sky-700 transition-transform active:scale-90"
                            >
                                <div className="flex items-center justify-center h-7 w-7 rounded-xl bg-sky-500/10 group-hover:bg-sky-500/20 transition-colors">
                                    <item.icon className="h-4 w-4" />
                                </div>
                                <span className="text-[10px] font-bold tracking-tight truncate max-w-[64px] text-center mt-0.5">
                                    {item.title}
                                </span>
                            </a>
                        );
                    }

                    return (
                        <Link
                            key={item.title}
                            href={item.url}
                            className={`group relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-all active:scale-90 ${
                                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {/* Active Pill Indicator */}
                            <div className={`flex items-center justify-center h-7 w-12 rounded-full transition-all duration-200 ${
                                isActive ? 'bg-primary/15 text-primary shadow-xs' : 'bg-transparent'
                            }`}>
                                <item.icon className={`h-4 w-4 transition-transform ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                            </div>
                            <span className={`text-[10px] tracking-tight truncate max-w-[64px] text-center mt-0.5 ${
                                isActive ? 'font-black text-primary' : 'font-semibold text-muted-foreground'
                            }`}>
                                {item.title}
                            </span>
                        </Link>
                    );
                })}

                {/* Drawer Trigger - "Lainnya" */}
                <Sheet>
                    <SheetTrigger asChild>
                        <button
                            type="button"
                            className="group relative flex flex-col items-center justify-center flex-1 h-full py-1 text-muted-foreground hover:text-foreground transition-all active:scale-90"
                            aria-label="Buka Semua Menu"
                        >
                            <div className="flex items-center justify-center h-7 w-12 rounded-full bg-muted/40 group-hover:bg-muted/80 transition-colors">
                                <Menu className="h-4 w-4" />
                            </div>
                            <span className="text-[10px] font-semibold tracking-tight text-center mt-0.5">
                                Lainnya
                            </span>
                        </button>
                    </SheetTrigger>

                    <SheetContent side="bottom" className="h-[88vh] max-h-[700px] px-0 py-0 flex flex-col rounded-t-3xl border-t border-border/80 bg-background overflow-hidden shadow-2xl">
                        {/* Drawer Handle */}
                        <div className="w-full pt-3 pb-2 flex flex-col items-center justify-center shrink-0 bg-background">
                            <div className="w-12 h-1.5 rounded-full bg-muted-foreground/25" />
                        </div>

                        {/* Drawer Header with User Card */}
                        <div className="px-5 pb-3 border-b border-border/50 shrink-0 space-y-3 bg-background">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-black text-sm border border-primary/20">
                                        {auth?.user?.name ? auth.user.name.slice(0, 2).toUpperCase() : 'U'}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <p className="text-sm font-bold text-foreground truncate max-w-[190px]">
                                            {auth?.user?.name || 'Pengguna'}
                                        </p>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                                                {user_role}
                                            </span>
                                            {activeSemester && (
                                                <span className="text-[10px] text-muted-foreground truncate">
                                                    &bull; {activeSemester.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Search Menu Input */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Cari fitur / menu..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-9 pl-9 pr-3 text-xs rounded-xl bg-muted/60 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background transition"
                                />
                            </div>
                        </div>

                        {/* Navigation Items List */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 pb-20 scrollbar-thin">
                            {filteredSections.length === 0 ? (
                                <div className="py-12 text-center text-muted-foreground text-xs">
                                    Tidak ada menu yang sesuai dengan "{searchQuery}"
                                </div>
                            ) : (
                                filteredSections.map((section) => (
                                    <div key={section.label} className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-black uppercase text-muted-foreground tracking-wider">
                                                {section.label}
                                            </span>
                                            <div className="h-px flex-1 bg-border/40" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2.5">
                                            {section.items.map((item) => {
                                                const isDashboard = item.url === '/dashboard' && currentPath === '/dashboard';
                                                const isActive = isDashboard || (item.url !== '/dashboard' && currentPath.startsWith(item.url || '#'));
                                                const IconComp = item.icon || Compass;

                                                return (
                                                    <SheetClose asChild key={item.title}>
                                                        <Link
                                                            href={item.url || '#'}
                                                            className={`group flex items-center gap-3 p-3 rounded-2xl border text-left transition-all active:scale-95 ${
                                                                isActive
                                                                    ? 'bg-primary/10 border-primary/30 text-primary shadow-xs font-bold'
                                                                    : 'bg-card border-border/60 text-foreground hover:bg-muted/60'
                                                            }`}
                                                        >
                                                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                                                                isActive ? 'bg-primary text-primary-foreground' : 'bg-muted/80 text-muted-foreground group-hover:text-foreground'
                                                            }`}>
                                                                <IconComp className="h-4 w-4" />
                                                            </div>
                                                            <span className="text-xs font-semibold leading-tight line-clamp-2">
                                                                {item.title}
                                                            </span>
                                                        </Link>
                                                    </SheetClose>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))
                            )}

                            {/* Account Shortcuts */}
                            <div className="pt-2 space-y-2 border-t border-border/50">
                                <span className="text-[11px] font-black uppercase text-muted-foreground tracking-wider">
                                    Pengaturan & Akun
                                </span>
                                <div className="grid grid-cols-1 gap-2">
                                    <SheetClose asChild>
                                        <Link
                                            href="/profile"
                                            className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 border border-border/40 transition active:scale-98"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-foreground">
                                                    <User className="h-4 w-4" />
                                                </div>
                                                <div className="text-xs font-bold text-foreground">Profil & Keamanan</div>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        </Link>
                                    </SheetClose>

                                    {user_role === 'admin' && (
                                        <SheetClose asChild>
                                            <Link
                                                href="/appearance"
                                                className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 border border-border/40 transition active:scale-98"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-foreground">
                                                        <Palette className="h-4 w-4" />
                                                    </div>
                                                    <div className="text-xs font-bold text-foreground">Tampilan & Tema</div>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                            </Link>
                                        </SheetClose>
                                    )}

                                    <SheetClose asChild>
                                        <Link
                                            href="/logout"
                                            method="post"
                                            as="button"
                                            type="button"
                                            className="w-full flex items-center justify-between p-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition active:scale-98"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400">
                                                    <LogOut className="h-4 w-4" />
                                                </div>
                                                <div className="text-xs font-bold">Keluar / Log Out</div>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-rose-500/60" />
                                        </Link>
                                    </SheetClose>
                                </div>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </div>
    );
}
