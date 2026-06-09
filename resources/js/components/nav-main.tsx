import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

function hasChildren(item: NavItem): item is NavItem & { children: NavItem[] } {
    return Array.isArray((item as any).children) && (item as any).children.length > 0;
}

function isActive(itemUrl: string, currentUrl: string) {
    if (itemUrl === '/dashboard') return currentUrl === '/dashboard';
    return currentUrl === itemUrl || currentUrl.startsWith(itemUrl + '/');
}

function NavItemComponent({ item, currentUrl }: { item: NavItem; currentUrl: string }) {
    const [open, setOpen] = useState(() => {
        if (hasChildren(item)) {
            return item.children.some((child) => isActive(child.url || '', currentUrl));
        }
        return false;
    });

    if (hasChildren(item)) {
        return (
            <Collapsible open={open} onOpenChange={setOpen} asChild>
                <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="[&[data-state=open]>svg:last-child]:rotate-0">
                            {item.icon && <item.icon />}
                            <span>{item.title}</span>
                            <ChevronDown className="ml-auto h-4 w-4 -rotate-90 transition-transform" />
                        </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <SidebarMenuSub>
                            {item.children.map((child) => (
                                <SidebarMenuSubItem key={child.title}>
                                    <SidebarMenuSubButton asChild isActive={isActive(child.url || '', currentUrl)}>
                                        <Link href={child.url || ''} prefetch>
                                            <span>{child.title}</span>
                                        </Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            ))}
                        </SidebarMenuSub>
                    </CollapsibleContent>
                </SidebarMenuItem>
            </Collapsible>
        );
    }

    return (
        <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive(item.url || '', currentUrl)}>
                <Link href={item.url || ''} prefetch>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}

export function NavMain({ items = [], label = 'Menu' }: { items: NavItem[]; label?: string }) {
    const page = usePage();

    if (items.length === 0) return null;

    const hasActive = items.some(item => {
        if (hasChildren(item)) return item.children.some(c => isActive(c.url || '', page.url));
        return isActive(item.url || '', page.url);
    });

    const isUtama = label === 'Utama';
    const [open, setOpen] = useState(() => hasActive || isUtama);

    return (
        <SidebarGroup className="px-3 py-0.5">
            <Collapsible open={open} onOpenChange={setOpen}>
                <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 hover:bg-sidebar-accent/30 transition-colors">
                        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
                        {label}
                    </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <SidebarMenu className="mt-0.5">
                        {items.map((item) => (
                            <NavItemComponent key={item.title} item={item} currentUrl={page.url} />
                        ))}
                    </SidebarMenu>
                </CollapsibleContent>
            </Collapsible>
        </SidebarGroup>
    );
}
