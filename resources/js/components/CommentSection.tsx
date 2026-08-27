import { useForm, router } from '@inertiajs/react';
import { 
    MessageSquare, 
    Send, 
    Trash2, 
    User,
    Clock
} from 'lucide-react';

interface Comment {
    id: number;
    user_id: number;
    user_name: string;
    user_avatar?: string | null;
    user_role: string;
    body: string;
    created_at: string;
}

interface CommentSectionProps {
    assignmentId?: number;
    materialId?: number;
    comments: Comment[];
    authId: number;
    userRole: string;
}

export default function CommentSection({ assignmentId, materialId, comments, authId, userRole }: CommentSectionProps) {
    const { data, setData, post, processing, reset, errors } = useForm({
        assignment_id: assignmentId || '',
        material_id: materialId || '',
        body: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('comments.store'), {
            preserveScroll: true,
            onSuccess: () => reset('body'),
        });
    };

    const handleDelete = (id: number) => {
        if (confirm('Hapus komentar ini?')) {
            router.delete(route('comments.destroy', id), {
                preserveScroll: true,
            });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <MessageSquare className="h-4.5 w-4.5 text-primary" />
                <h3 className="text-sm sm:text-base font-bold text-foreground">Diskusi Pembelajaran</h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                    {comments.length}
                </span>
            </div>

            {/* Post Comment */}
            <form onSubmit={handleSubmit} className="relative space-y-2">
                <textarea
                    rows={3}
                    placeholder="Ada yang belum kamu pahami atau ingin didiskusikan? Tanyakan di sini..."
                    value={data.body}
                    onChange={(e) => setData('body', e.target.value)}
                    className="w-full rounded-2xl border border-border bg-card p-3.5 text-xs sm:text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs transition placeholder:text-muted-foreground/60"
                ></textarea>
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={processing || !data.body.trim()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs transition hover:bg-primary/90 disabled:opacity-50 min-h-[40px]"
                    >
                        <Send className="h-3.5 w-3.5" />
                        Kirim Pertanyaan
                    </button>
                </div>
                {errors.body && <p className="mt-1 text-xs text-destructive">{errors.body}</p>}
            </form>

            {/* Comment List */}
            <div className="space-y-3 pt-2">
                {comments.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground/70 rounded-2xl border border-dashed border-border/70 p-4">
                        <p className="text-xs font-medium">Belum ada pertanyaan. Jadilah yang pertama berdiskusi dengan guru dan teman sekelas!</p>
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3 p-3.5 rounded-2xl bg-card border border-border/70 shadow-2xs transition-all">
                            <div className="h-9 w-9 shrink-0 rounded-xl overflow-hidden bg-primary/10 flex items-center justify-center font-bold text-xs text-primary border border-primary/20">
                                {comment.user_avatar ? (
                                    <img
                                        src={comment.user_avatar}
                                        alt={comment.user_name}
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                            (e.currentTarget as HTMLElement).style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <span>{comment.user_name ? comment.user_name.charAt(0).toUpperCase() : '?'}</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-[#1B1B25] dark:text-[#F1F1F4]">{comment.user_name}</span>
                                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-tight ${comment.user_role === 'teacher' ? 'bg-[#5E6AD2]/10 text-[#5E6AD2]' : 'bg-[#5E6AD2]/5 text-[#5E6AD2]/80'}`}>
                                            {comment.user_role}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="flex items-center gap-1 text-[10px] text-[#8A8F98]">
                                            <Clock className="h-3 w-3" />
                                            {comment.created_at}
                                        </span>
                                        {(authId === comment.user_id || userRole === 'teacher') && (
                                            <button 
                                                onClick={() => handleDelete(comment.id)}
                                                className="p-1 text-[#8A8F98]/40 hover:text-[#EB5757] transition"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <p className="text-sm text-[#8A8F98] dark:text-[#8A8F98] whitespace-pre-wrap">{comment.body}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
