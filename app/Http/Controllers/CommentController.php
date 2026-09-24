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

        $user = Auth::user();

        // Validasi akses kelas untuk siswa
        if ($user->student) {
            $studentClassId = $user->student->school_class_id;

            if (!empty($validated['material_id'])) {
                $material = \App\Models\LmsMaterial::find($validated['material_id']);
                if ($material && $material->schoolClasses()->count() > 0) {
                    $hasAccess = $material->schoolClasses()->where('school_classes.id', $studentClassId)->exists();
                    if (!$hasAccess) {
                        abort(403, 'Anda tidak terdaftar di kelas materi ini.');
                    }
                }
            }

            if (!empty($validated['assignment_id'])) {
                $assignment = \App\Models\LmsAssignment::find($validated['assignment_id']);
                if ($assignment && $assignment->schoolClasses()->count() > 0) {
                    $hasAccess = $assignment->schoolClasses()->where('school_classes.id', $studentClassId)->exists();
                    if (!$hasAccess) {
                        abort(403, 'Anda tidak terdaftar di kelas asesmen ini.');
                    }
                }
            }
        }

        LmsComment::create([
            'user_id'       => $user->id,
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
