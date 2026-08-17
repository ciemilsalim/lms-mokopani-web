<?php

namespace App\Http\Controllers;

use App\Models\Teacher;
use Inertia\Inertia;

class TeacherController extends Controller
{
    public function index()
    {
        $teachers = Teacher::with(['user', 'subjects'])
            ->orderBy('name')
            ->get()
            ->map(fn ($t) => [
                'id'          => $t->id,
                'name'        => $t->name,
                'nip'         => $t->nip,
                'photo'       => $t->photo_url,
                'subjects'    => $t->subjects->pluck('name')->join(', '),
                'has_account' => $t->user_id !== null,
            ]);

        return Inertia::render('teachers/index', ['teachers' => $teachers]);
    }
}
