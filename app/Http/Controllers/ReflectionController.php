<?php

namespace App\Http\Controllers;

use App\Models\LmsReflection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ReflectionController extends Controller
{
    public function store(Request $request)
    {
        $student = Auth::user()->student;
        if (!$student) {
            abort(403);
        }

        $validated = $request->validate([
            'assignment_id'       => 'nullable|exists:lms_assignments,id',
            'material_id'         => 'nullable|exists:lms_materials,id',
            'understanding_level' => 'required|integer|min:1|max:5',
            'interesting_thing'   => 'nullable|string',
            'difficulty'          => 'nullable|string',
        ]);

        if (empty($validated['assignment_id']) && empty($validated['material_id'])) {
            return back()->with('error', 'Target refleksi tidak valid.');
        }

        // Enforce cross-class authorization & lock check for material
        if (!empty($validated['material_id'])) {
            $material = \App\Models\LmsMaterial::with('schoolClasses')->find($validated['material_id']);
            if (!$material || !$student->school_class_id || !$material->schoolClasses->contains('id', $student->school_class_id)) {
                abort(403, 'Anda tidak terdaftar di kelas materi ini.');
            }
            if ($material->access_status === 'locked') {
                abort(403, 'Materi sedang dikunci oleh guru.');
            }
        }

        // Enforce cross-class authorization for assignment
        if (!empty($validated['assignment_id'])) {
            $assignment = \App\Models\LmsAssignment::with('schoolClasses')->find($validated['assignment_id']);
            if (!$assignment || !$student->school_class_id || !$assignment->schoolClasses->contains('id', $student->school_class_id)) {
                abort(403, 'Anda tidak terdaftar di kelas asesmen ini.');
            }
        }

        LmsReflection::updateOrCreate(
            [
                'student_id'    => $student->id,
                'assignment_id' => $validated['assignment_id'] ?? null,
                'material_id'   => $validated['material_id'] ?? null,
            ],
            [
                'understanding_level' => $validated['understanding_level'],
                'interesting_thing'   => $validated['interesting_thing'],
                'difficulty'          => $validated['difficulty'],
            ]
        );

        // Submitting reflection also marks material as completed
        if (!empty($validated['material_id'])) {
            \App\Models\LmsStudentMaterial::updateOrCreate(
                ['student_id' => $student->id, 'material_id' => $validated['material_id']],
                ['completed_at' => now()]
            );
        }

        return back()->with('success', 'Refleksi berhasil disimpan. Terima kasih!');
    }
}
