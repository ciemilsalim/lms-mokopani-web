<?php

namespace App\Http\Controllers;

use App\Models\LmsAnnouncement;
use App\Models\Notification;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\TeachingAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AnnouncementController extends Controller
{
    private function getTeacherClasses($user)
    {
        $teacher = $user->teacher ?? Teacher::where('user_id', $user->id)->orWhere('email', $user->email)->first();
        if ($teacher && $user->role !== 'admin') {
            $teachingClassIds = TeachingAssignment::where('teacher_id', $teacher->id)
                ->pluck('school_class_id')
                ->filter()
                ->unique();

            return SchoolClass::whereIn('id', $teachingClassIds)
                ->orderBy('name')
                ->get(['id', 'name'])
                ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
                ->values();
        }

        return SchoolClass::orderBy('name')
            ->get(['id', 'name'])
            ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
            ->values();
    }

    public function index()
    {
        $user = Auth::user();
        $query = LmsAnnouncement::with(['teacher', 'schoolClass']);
        $teacher = $user->teacher ?? Teacher::where('user_id', $user->id)->orWhere('email', $user->email)->first();

        if ($teacher && $user->role !== 'admin') {
            $query->where('teacher_id', $teacher->id);
        } else if ($user->student) {
            $query->where(function ($q) use ($user) {
                $q->where('school_class_id', $user->student->school_class_id)
                  ->orWhereNull('school_class_id');
            });
        }

        $announcements = $query->latest()->get()->map(fn ($a) => [
            'id'           => $a->id,
            'title'        => $a->title,
            'content'      => $a->content,
            'priority'     => $a->priority,
            'teacher_name' => $a->teacher?->name,
            'class_name'   => $a->schoolClass?->name ?? 'Semua Kelas',
            'created_at'   => $a->created_at->diffForHumans(),
        ]);

        $classes = $this->getTeacherClasses($user);

        return Inertia::render('announcements/index', [
            'announcements' => $announcements,
            'classes'       => $classes,
            'user_role'     => $user->role ?? ($teacher ? 'teacher' : ($user->student ? 'student' : 'user'))
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $teacher = $user->teacher ?? Teacher::where('user_id', $user->id)->orWhere('email', $user->email)->first();

        $validated = $request->validate([
            'school_class_id' => 'nullable|exists:mysql_absensi.school_classes,id',
            'title'           => 'required|string|max:255',
            'content'         => 'required|string',
            'priority'        => 'required|in:info,warning,important',
        ]);

        if ($teacher && !empty($validated['school_class_id']) && $user->role !== 'admin') {
            $isAssigned = TeachingAssignment::where('teacher_id', $teacher->id)
                ->where('school_class_id', $validated['school_class_id'])
                ->exists();
            if (!$isAssigned) {
                return back()->withErrors(['school_class_id' => 'Anda hanya dapat memilih kelas yang Anda ampu.']);
            }
        }

        $validated['teacher_id'] = $teacher?->id;

        $announcement = LmsAnnouncement::create($validated);

        $priorityLabels = ['info' => 'Info', 'warning' => 'Peringatan', 'important' => 'Penting'];

        $studentIds = $announcement->school_class_id
            ? Student::where('school_class_id', $announcement->school_class_id)->pluck('user_id')
            : ($teacher && $user->role !== 'admin'
                ? Student::whereIn('school_class_id', TeachingAssignment::where('teacher_id', $teacher->id)->pluck('school_class_id'))->pluck('user_id')
                : Student::pluck('user_id')
            );

        foreach ($studentIds->filter() as $userId) {
            Notification::create([
                'user_id' => $userId,
                'type'    => 'announcement',
                'title'   => $announcement->title,
                'message' => 'Pengumuman ' . ($priorityLabels[$announcement->priority] ?? $announcement->priority),
                'data'    => [
                    'announcement_id' => $announcement->id,
                    'priority'        => $announcement->priority,
                ],
            ]);
        }

        return redirect()->route('announcements.index')->with('success', 'Pengumuman berhasil diterbitkan.');
    }

    public function edit(LmsAnnouncement $announcement)
    {
        $user = Auth::user();
        $teacher = $user->teacher ?? Teacher::where('user_id', $user->id)->orWhere('email', $user->email)->first();

        if ($teacher && $announcement->teacher_id && $announcement->teacher_id !== $teacher->id && $user->role !== 'admin') {
            abort(403, 'Anda tidak memiliki hak untuk mengedit pengumuman ini.');
        }

        $classes = $this->getTeacherClasses($user);

        return Inertia::render('announcements/edit', [
            'announcement' => $announcement,
            'classes'      => $classes,
        ]);
    }

    public function update(Request $request, LmsAnnouncement $announcement)
    {
        $user = Auth::user();
        $teacher = $user->teacher ?? Teacher::where('user_id', $user->id)->orWhere('email', $user->email)->first();

        if ($teacher && $announcement->teacher_id && $announcement->teacher_id !== $teacher->id && $user->role !== 'admin') {
            abort(403, 'Anda tidak memiliki hak untuk mengubah pengumuman ini.');
        }

        $validated = $request->validate([
            'school_class_id' => 'nullable|exists:mysql_absensi.school_classes,id',
            'title'           => 'required|string|max:255',
            'content'         => 'required|string',
            'priority'        => 'required|in:info,warning,important',
        ]);

        if ($teacher && !empty($validated['school_class_id']) && $user->role !== 'admin') {
            $isAssigned = TeachingAssignment::where('teacher_id', $teacher->id)
                ->where('school_class_id', $validated['school_class_id'])
                ->exists();
            if (!$isAssigned) {
                return back()->withErrors(['school_class_id' => 'Anda hanya dapat memilih kelas yang Anda ampu.']);
            }
        }

        $announcement->update($validated);

        return redirect()->route('announcements.index')->with('success', 'Pengumuman berhasil diperbarui.');
    }

    public function destroy(LmsAnnouncement $announcement)
    {
        $user = Auth::user();
        $teacher = $user->teacher ?? Teacher::where('user_id', $user->id)->orWhere('email', $user->email)->first();

        if ($teacher && $announcement->teacher_id && $announcement->teacher_id !== $teacher->id && $user->role !== 'admin') {
            abort(403, 'Anda tidak memiliki hak untuk menghapus pengumuman ini.');
        }

        $announcement->delete();
        return redirect()->route('announcements.index')->with('success', 'Pengumuman berhasil dihapus.');
    }
}

