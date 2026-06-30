import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { getNavSections } from './app-sidebar';

export function MobileBottomNav() {
    const { user_role } = usePage<SharedData>().props;
    const sections = getNavSections(user_role);
    
    // Flat all items to find the best 4-5 items for the bottom nav
    const allItems = sections.flatMap(s => s.items);
    
    // Pick the most relevant items to display on the bottom nav.
    // E.g., Dashboard, Subjects/Materials, etc. We'll take the first 4 items for now.
    const navItems = allItems.slice(0, 4);

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] flex h-16 items-center justify-around border-t border-border/60 bg-card px-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_10px_rgba(0,0,0,0.2)]">
            {navItems.map((item) => {
                const isActive = window.location.pathname.startsWith(item.url || '#');
                return (
                    <Link
                        key={item.title}
                        href={item.url || '#'}
                        className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        {item.icon && <item.icon className={`h-5 w-5 ${isActive ? 'fill-primary/20' : ''}`} />}
                        <span className="text-[10px] font-semibold tracking-tight truncate max-w-[72px] text-center">
                            {item.title}
                        </span>
                    </Link>
                );
            })}
        </div>
    );
}
