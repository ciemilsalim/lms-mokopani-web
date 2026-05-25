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
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-[#5E6AD2]" />
                <h3 className="text-lg font-bold text-[#1B1B25] dark:text-[#F1F1F4]">Diskusi & Komentar</h3>
                <span className="rounded-full bg-[#F1F1F4]/50 dark:bg-[#2C2C3A] px-2 py-0.5 text-xs font-bold text-[#8A8F98]">
                    {comments.length}
                </span>
            </div>

            {/* Post Comment */}
            <form onSubmit={handleSubmit} className="relative">
                <textarea
                    rows={3}
                    placeholder="Tuliskan pertanyaan atau komentar Anda..."
                    value={data.body}
                    onChange={(e) => setData('body', e.target.value)}
                    className="w-full rounded-2xl border border-[#2C2C3A]/20 bg-white p-4 text-sm outline-none focus:border-[#5E6AD2] focus:ring-4 focus:ring-[#5E6AD2]/10 dark:border-[#2C2C3A] dark:bg-[#1B1B25] dark:text-[#F1F1F4] shadow-sm transition"
                ></textarea>
                <div className="mt-2 flex justify-end">
                    <button
                        type="submit"
                        disabled={processing || !data.body.trim()}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#5E6AD2] px-5 py-2 text-sm font-bold text-white shadow-lg shadow-[#5E6AD2]/20 transition hover:bg-[#4B55A8] disabled:opacity-50 dark:shadow-none"
                    >
                        <Send className="h-4 w-4" />
                        Kirim
                    </button>
                </div>
                {errors.body && <p className="mt-1 text-xs text-[#EB5757]">{errors.body}</p>}
            </form>

            {/* Comment List */}
            <div className="space-y-4">
                {comments.length === 0 ? (
                    <div className="py-10 text-center text-[#8A8F98]/60">
                        <p className="text-sm">Belum ada diskusi. Jadilah yang pertama bertanya!</p>
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="flex gap-4 p-4 rounded-2xl bg-white dark:bg-[#1B1B25] border border-[#2C2C3A]/10 dark:border-[#2C2C3A] shadow-sm transition-all hover:shadow-md">
                            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl font-bold text-white ${comment.user_role === 'teacher' ? 'bg-[#5E6AD2]' : 'bg-[#5E6AD2]/70'}`}>
                                <User className="h-5 w-5" />
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
