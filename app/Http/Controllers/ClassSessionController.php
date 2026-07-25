<?php

namespace App\Http\Controllers;

use App\Models\LmsClassSession;
use App\Models\LmsAiCache;
use App\Models\SubjectAttendance;
use App\Models\Student;
use App\Services\AiManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ClassSessionController extends Controller
{
    /**
     * Display list of sessions for a modul ajar or teacher.
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        // ── AKSED OLEH SISWA ──────────────────────────────────────────
        if ($user->role === 'student' || ($user->student && !$user->teacher)) {
            $student = $user->student;
            $classId = $student?->school_class_id;

            $query = \App\Models\LmsModulAjar::with(['teacher', 'schoolClass', 'subject', 'learningObjective', 'material'])
                ->orderBy('created_at', 'desc');

            if ($classId) {
                $query->where(function($q) use ($classId) {
                    $q->where('school_class_id', $classId)
                      ->orWhereNull('school_class_id');
                });
            }

            $modulAjars = $query->get();

            // Ambil semua Tugas & Asesmen dari Guru (misal Budi Santoso, S.Kom)
            $asgnQuery = \App\Models\LmsAssignment::with(['teacher', 'subject'])->latest();
            if ($classId) {
                $asgnQuery->where(function($q) use ($classId) {
                    $q->whereHas('schoolClasses', function ($subQ) use ($classId) {
                        $subQ->where('school_classes.id', $classId);
                    })->orDoesntHave('schoolClasses');
                });
            }
            $assignments = $asgnQuery->get();

            return Inertia::render('class-sessions/index', [
                'modulAjars' => $modulAjars,
                'assignments' => $assignments,
                'isStudent' => true
            ]);
        }

        // ── AKSES OLEH GURU / ADMIN ────────────────────────────────────
        $teacherId = $user->teacher?->id;

        $modulAjarsQuery = \App\Models\LmsModulAjar::with(['subject', 'learningObjective', 'material', 'teacher', 'schoolClass'])
            ->latest();
            
        if ($teacherId && $user->role !== 'admin') {
            $modulAjarsQuery->where('teacher_id', $teacherId);
        }

        $modulAjars = $modulAjarsQuery->get();

        return Inertia::render('class-sessions/index', [
            'modulAjars' => $modulAjars,
            'isStudent' => false
        ]);
    }

    /**
     * Render Learning Execution Page for Teachers (Alur Pembelajaran).
     */
    public function live($id)
    {
        $modulAjar = \App\Models\LmsModulAjar::with(['subject', 'schoolClass', 'learningObjective', 'material'])->findOrFail($id);
        
        return Inertia::render('class-sessions/live', [
            'modulAjar' => $modulAjar,
            'attendances' => [] // Sesuai permintaan, observasi ditiadakan/disederhanakan. Absensi dipisah atau tidak dibutuhkan di alur ini.
        ]);
    }

    /**
     * Render Learning Execution Page for Students (Materi & Alur Belajar).
     */
    public function studentLive($id)
    {
        $modulAjar = \App\Models\LmsModulAjar::with(['teacher', 'subject', 'learningObjective', 'material'])->findOrFail($id);
        
        return Inertia::render('class-sessions/student-live', [
            'modulAjar' => $modulAjar
        ]);
    }

    /**
     * Generate Learning Steps (Memahami, Mengaplikasi, Merefleksi) via OpenRouter AI.
     */
    public function generateLearningSteps(Request $request, AiManager $aiManager)
    {
        $validated = $request->validate([
            'tp_text' => 'required|string',
        ]);

        $tpText = $validated['tp_text'];
        $hash = md5('generate_steps_' . $tpText);
        $cached = LmsAiCache::getCache($hash);

        if ($cached) {
            return response()->json([
                'status' => 'success',
                'source' => 'cache',
                'data' => json_decode($cached, true) ?? ['raw' => $cached]
            ]);
        }

        try {
            $aiResult = $aiManager->generateLearningSteps($tpText);
            LmsAiCache::setCache($hash, 'learning_steps', ['tp_text' => $tpText], $aiResult);

            $clean = preg_replace('/^```(?:json)?\s*/i', '', trim($aiResult));
            $clean = preg_replace('/\s*```$/', '', $clean);
            $decoded = json_decode($clean, true);

            return response()->json([
                'status' => 'success',
                'source' => 'ai',
                'data' => $decoded ?? ['raw' => $aiResult]
            ]);
        } catch (\Throwable $e) {
            Log::error('AI generateLearningSteps error: ' . $e->getMessage());

            return response()->json([
                'status' => 'fallback',
                'message' => 'Layanan AI sedang tidak dapat dijangkau. Silakan susun langkah pembelajaran secara manual.',
                'data' => [
                    'memahami' => ['scenario' => '', 'activities' => []],
                    'mengaplikasi' => ['scenario' => '', 'activities' => []],
                    'merefleksi' => ['scenario' => '', 'activities' => []]
                ]
            ]);
        }
    }
}
