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

        return back()->with('success', 'Refleksi berhasil disimpan. Terima kasih!');
    }
}
