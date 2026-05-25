<?php

namespace App\Http\Controllers;

use App\Models\LmsComment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CommentController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'assignment_id' => 'nullable|exists:lms_assignments,id',
            'material_id'   => 'nullable|exists:lms_materials,id',
            'body'          => 'required|string',
        ]);

        LmsComment::create([
            'user_id'       => Auth::id(),
            'assignment_id' => $validated['assignment_id'] ?? null,
            'material_id'   => $validated['material_id'] ?? null,
            'body'          => $validated['body'],
        ]);

        return back()->with('success', 'Komentar berhasil ditambahkan.');
    }

    public function destroy(LmsComment $comment)
    {
        // Only owner or teacher can delete
        if (Auth::id() !== $comment->user_id && !Auth::user()->teacher) {
            abort(403);
        }

        $comment->delete();
        return back()->with('success', 'Komentar berhasil dihapus.');
    }
}
