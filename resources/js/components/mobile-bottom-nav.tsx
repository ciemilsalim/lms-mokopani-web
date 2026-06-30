import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Menu } from 'lucide-react';
import { getNavSections } from './app-sidebar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { NavMain } from './nav-main';
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
                <SheetContent side="bottom" className="h-[80vh] px-0 py-4 flex flex-col gap-0">
                    <SheetHeader className="px-6 pb-4 border-b border-border/60 text-left">
                        <SheetTitle className="flex items-center gap-2">
                            <AppLogo />
                        </SheetTitle>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-4">
                        {sections.map((section) => (
                            <NavMain key={section.label} items={section.items} label={section.label} />
                        ))}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
