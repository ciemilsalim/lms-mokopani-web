import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { type User, type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    teacher: 'Guru',
    student: 'Siswa',
    parent: 'Orang Tua',
    user: 'Pengguna',
    guest: 'Tamu',
};

const roleBadgeStyles: Record<string, string> = {
    admin: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400',
    teacher: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400',
    student: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    parent: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    user: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    guest: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
};

export function UserInfo({ user, showEmail = false }: { user: User; showEmail?: boolean }) {
    const getInitials = useInitials();
    const { user_role } = usePage<SharedData>().props;

    return (
        <>
            <Avatar className="h-8 w-8 overflow-hidden rounded-full">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-full bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                    {getInitials(user.name)}
                </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                {showEmail ? (
                    <span className="text-muted-foreground truncate text-xs">{user.email}</span>
                ) : (
                    <span className={`inline-flex w-fit rounded-full px-1.5 py-0 text-[9px] font-bold uppercase tracking-wider ${roleBadgeStyles[user_role] || roleBadgeStyles.guest}`}>
                        {roleLabels[user_role] || user_role}
                    </span>
                )}
            </div>
        </>
    );
}
