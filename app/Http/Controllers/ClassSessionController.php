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
        $teacherId = Auth::user()->teacher?->id ?? Auth::id();

        $query = LmsClassSession::with(['modulAjar', 'schoolClass'])
            ->where('teacher_id', $teacherId);

        if ($request->has('modul_ajar_id')) {
            $query->where('modul_ajar_id', $request->modul_ajar_id);
        }

        $sessions = $query->orderBy('created_at', 'desc')->get();

        return Inertia::render('class-sessions/index', [
            'sessions' => $sessions
        ]);
    }

    /**
     * Start a new class session.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'modul_ajar_id' => 'nullable|exists:lms_modul_ajars,id',
            'school_class_id' => 'nullable|integer',
            'session_data' => 'nullable|array',
        ]);

        $teacherId = Auth::user()->teacher?->id ?? Auth::id() ?? 1;

        $session = LmsClassSession::create([
            'modul_ajar_id' => $validated['modul_ajar_id'] ?? null,
            'teacher_id' => $teacherId,
            'school_class_id' => $validated['school_class_id'] ?? null,
            'start_time' => now(),
            'session_data' => $validated['session_data'] ?? [
                'observations' => [],
                'formative_assessments' => [],
                'summative_results' => [],
                'reflection' => ''
            ],
            'attendance_synced' => true,
        ]);

        return redirect()->route('class-sessions.live', $session->id)
            ->with('success', 'Sesi pembelajaran berhasil dimulai.');
    }

    /**
     * Render Live Class Session Execution Page (Shadcn UI & Attendance Integration).
     */
    public function live($id)
    {
        $session = LmsClassSession::with(['modulAjar', 'schoolClass'])->findOrFail($id);
        
        // Fetch Attendance records directly from subject_attendances table (Aplikasi Absensi) & fallback to daily attendances
        $attendances = [];
        if ($session->school_class_id) {
            $students = Student::where('school_class_id', $session->school_class_id)->get();
            $studentIds = $students->pluck('id');
            
            $subjectAttendanceRecords = SubjectAttendance::whereIn('student_id', $studentIds)
                ->whereDate('created_at', now()->toDateString())
                ->get()
                ->keyBy('student_id');

            // Daily attendance from Aplikasi Absensi (attendances table)
            $dailyAttendanceRecords = \App\Models\Attendance::whereIn('student_id', $studentIds)
                ->whereDate('attendance_time', now()->toDateString())
                ->get()
                ->keyBy('student_id');

            $attendances = $students->map(function ($student) use ($subjectAttendanceRecords, $dailyAttendanceRecords) {
                $subRec = $subjectAttendanceRecords->get($student->id);
                $dailyRec = $dailyAttendanceRecords->get($student->id);
                
                // Determine initial status: prefer subject attendance, then daily attendance status, else 'hadir'
                $status = $subRec?->status ?? $dailyRec?->status ?? 'hadir';
                
                return [
                    'student_id' => $student->id,
                    'student_name' => $student->name,
                    'nis' => $student->nis ?? $student->nisn ?? '-',
                    'status' => strtolower($status),
                    'notes' => $subRec?->notes ?? ($dailyRec ? 'Absensi Harian SIPADA' : ''),
                ];
            });
        }

        return Inertia::render('class-sessions/live', [
            'session' => $session,
            'attendances' => $attendances
        ]);
    }

    /**
     * Render Live Class Session Page for Students (Dasbor Alur Belajar).
     */
    public function studentLive($id)
    {
        $session = LmsClassSession::with(['modulAjar', 'teacher'])->findOrFail($id);
        
        $student = Auth::user()->student;
        if ($session->school_class_id && $student && $student->school_class_id !== $session->school_class_id) {
            abort(403, 'Akses ditolak. Anda bukan peserta di kelas ini.');
        }

        return Inertia::render('class-sessions/student-live', [
            'session' => $session
        ]);
    }

    /**
     * Show session detail API.
     */
    public function show($id)
    {
        $session = LmsClassSession::with(['modulAjar', 'schoolClass'])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $session
        ]);
    }

    /**
     * Update session data (autosave observation, formative, summative, reflection).
     */
    public function update(Request $request, $id)
    {
        $session = LmsClassSession::findOrFail($id);

        $validated = $request->validate([
            'session_data' => 'nullable|array',
            'end_session' => 'nullable|boolean',
        ]);

        if (isset($validated['session_data'])) {
            $session->session_data = array_merge($session->session_data ?? [], $validated['session_data']);
        }

        if (!empty($validated['end_session'])) {
            $session->end_time = now();
        }

        $session->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Data pelaksanaan kelas berhasil diperbarui.',
            'data' => $session
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
