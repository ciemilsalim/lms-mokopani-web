<?php

namespace App\Http\Controllers;

use App\Models\LmsAnnouncement;
use App\Models\Notification;
use App\Models\SchoolClass;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AnnouncementController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $query = LmsAnnouncement::with(['teacher', 'schoolClass']);

        if ($user->teacher) {
            $query->where('teacher_id', $user->teacher->id);
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

        $classes = SchoolClass::all(['id', 'name']);

        return Inertia::render('announcements/index', [
            'announcements' => $announcements,
            'classes'       => $classes,
            'user_role'     => $user->role ?? ($user->teacher ? 'teacher' : 'student')
        ]);
    }

    public function store(Request $request)
    {
        $teacher = Auth::user()->teacher;

        $validated = $request->validate([
            'school_class_id' => 'nullable|exists:mysql_absensi.school_classes,id',
            'title'           => 'required|string|max:255',
            'content'         => 'required|string',
            'priority'        => 'required|in:info,warning,important',
        ]);

        $validated['teacher_id'] = $teacher->id;

        $announcement = LmsAnnouncement::create($validated);

        $priorityLabels = ['info' => 'Info', 'warning' => 'Peringatan', 'important' => 'Penting'];

        $studentIds = $announcement->school_class_id
            ? Student::where('school_class_id', $announcement->school_class_id)->pluck('user_id')
            : Student::pluck('user_id');

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
        $classes = SchoolClass::all(['id', 'name']);
        return Inertia::render('announcements/edit', [
            'announcement' => $announcement,
            'classes'      => $classes,
        ]);
    }

    public function update(Request $request, LmsAnnouncement $announcement)
    {
        $validated = $request->validate([
            'school_class_id' => 'nullable|exists:mysql_absensi.school_classes,id',
            'title'           => 'required|string|max:255',
            'content'         => 'required|string',
            'priority'        => 'required|in:info,warning,important',
        ]);

        $announcement->update($validated);

        return redirect()->route('announcements.index')->with('success', 'Pengumuman berhasil diperbarui.');
    }

    public function destroy(LmsAnnouncement $announcement)
    {
        $announcement->delete();
        return redirect()->route('announcements.index')->with('success', 'Pengumuman berhasil dihapus.');
    }
}
