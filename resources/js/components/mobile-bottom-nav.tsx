import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Menu, LogOut, Settings, Palette, ExternalLink } from 'lucide-react';
import { getNavSections } from './app-sidebar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from './ui/sheet';
import AppLogo from './app-logo';

export function MobileBottomNav() {
    const { user_role } = usePage<SharedData>().props;
    const sections = getNavSections(user_role);
    
    // Flat all items to find the primary ones
    const allItems = sections.flatMap(s => s.items);
    
    // Define the most important URLs for quick access based on role
    let primaryUrls: string[] = [];
    switch (user_role) {
        case 'teacher':
            primaryUrls = ['/dashboard', '/materials', '/gradebook'];
            break;
        case 'student':
            primaryUrls = ['/dashboard', '/subjects', '/gradebook'];
            break;
        case 'admin':
            primaryUrls = ['/dashboard', '/teachers', '/students'];
            break;
        case 'parent':
            primaryUrls = ['/dashboard', '/parent/dashboard'];
            break;
        default:
            primaryUrls = ['/dashboard'];
            break;
    }

    // Get the primary items preserving the order of primaryUrls
    const primaryItems = primaryUrls
        .map(url => allItems.find(item => item.url === url))
        .filter(Boolean) as NavItem[];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-border/60 bg-card px-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_10px_rgba(0,0,0,0.2)] pb-safe">
            {primaryItems.map((item) => {
                const isActive = window.location.pathname.startsWith(item.url || '#') && item.url !== '/';
                const isDashboard = item.url === '/dashboard' && window.location.pathname === '/dashboard';
                const actuallyActive = isDashboard || (isActive && item.url !== '/dashboard');
                
                return (
                    <Link
                        key={item.title}
                        href={item.url || '#'}
                        className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${actuallyActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        {item.icon && <item.icon className={`h-5 w-5 ${actuallyActive ? 'fill-primary/20' : ''}`} />}
                        <span className="text-[10px] font-semibold tracking-tight truncate max-w-[72px] text-center">
                            {item.title}
                        </span>
                    </Link>
                );
            })}

            {/* Menu Lainnya */}
            <Sheet>
                <SheetTrigger asChild>
                    <button className="flex flex-col items-center justify-center w-full h-full gap-1 text-muted-foreground hover:text-foreground transition-colors">
                        <Menu className="h-5 w-5" />
                        <span className="text-[10px] font-semibold tracking-tight">Lainnya</span>
                    </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85vh] px-0 py-4 flex flex-col gap-0 rounded-t-2xl">
                    <SheetHeader className="px-5 pb-4 border-b border-border/60 text-left sticky top-0 bg-background z-10 shrink-0">
                        <SheetTitle className="flex items-center gap-2">
                            <span className="font-semibold text-foreground text-base">Menu Navigasi</span>
                        </SheetTitle>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-6 pb-12">
                        {sections.map((section) => (
                            <div key={section.label}>
                                <div className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider mb-3">
                                    {section.label}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {section.items.map((item) => {
                                        const isActive = window.location.pathname.startsWith(item.url || '#') && item.url !== '/';
                                        const isDashboard = item.url === '/dashboard' && window.location.pathname === '/dashboard';
                                        const actuallyActive = isDashboard || (isActive && item.url !== '/dashboard');

                                        return (
                                            <SheetClose asChild key={item.title}>
                                                <Link
                                                    href={item.url || '#'}
                                                    className={`group flex flex-col items-center justify-center gap-1.5 text-center p-3.5 rounded-xl text-[11px] font-semibold border transition-all duration-300 ${
                                                        actuallyActive
                                                            ? 'bg-primary/5 border-primary/20 text-primary shadow-sm'
                                                            : 'bg-muted/40 border-border/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                                                    }`}
                                                >
                                                    <div className="opacity-80 group-hover:opacity-100 transition-opacity">
                                                        {item.icon && <item.icon className="h-5 w-5" />}
                                                    </div>
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SheetClose>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        
                        {/* Profile & Logout Section */}
                        <div className="pt-2 border-t border-border/60">
                            <div className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider mb-3 mt-2">
                                Pengaturan Akun
                            </div>
                            <div className="space-y-2">
                                <SheetClose asChild>
                                    <Link href="/profile" className="flex items-center gap-3 px-4 py-3 bg-muted/40 rounded-xl hover:bg-muted/60 transition text-foreground">
                                        <Settings className="h-5 w-5 text-muted-foreground" />
                                        <span className="text-sm font-semibold">Profil Saya</span>
                                    </Link>
                                </SheetClose>
                                {user_role === 'admin' && (
                                    <SheetClose asChild>
                                        <Link href="/appearance" className="flex items-center gap-3 px-4 py-3 bg-muted/40 rounded-xl hover:bg-muted/60 transition text-foreground">
                                            <Palette className="h-5 w-5 text-muted-foreground" />
                                            <span className="text-sm font-semibold">Tampilan & Logo</span>
                                        </Link>
                                    </SheetClose>
                                )}
                                {(user_role === 'admin' || user_role === 'teacher') && (
                                    <SheetClose asChild>
                                        <a href="/sso/presensi" className="flex items-center gap-3 px-4 py-3 bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/50 text-sky-600 dark:text-sky-400 rounded-xl hover:bg-sky-100 dark:hover:bg-sky-950/40 transition">
                                            <ExternalLink className="h-5 w-5" />
                                            <span className="text-sm font-semibold">Aplikasi Presensi</span>
                                        </a>
                                    </SheetClose>
                                )}
                                <SheetClose asChild>
                                    <Link href="/logout" method="post" as="button" type="button" className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-950/40 transition">
                                        <LogOut className="h-5 w-5" />
                                        <span className="text-sm font-semibold">Keluar / Logout</span>
                                    </Link>
                                </SheetClose>
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
