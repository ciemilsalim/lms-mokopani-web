<?php

namespace App\Http\Controllers;

use App\Models\LmsClassSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ClassSessionController extends Controller
{
    /**
     * Display list of sessions for a modul ajar or teacher.
     */
    public function index(Request $request)
    {
        $query = LmsClassSession::with(['modulAjar', 'schoolClass'])
            ->where('teacher_id', Auth::id());

        if ($request->has('modul_ajar_id')) {
            $query->where('modul_ajar_id', $request->modul_ajar_id);
        }

        $sessions = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $sessions
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

        $session = LmsClassSession::create([
            'modul_ajar_id' => $validated['modul_ajar_id'] ?? null,
            'teacher_id' => Auth::id() ?? 1,
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

        return response()->json([
            'status' => 'success',
            'message' => 'Sesi pembelajaran berhasil dimulai.',
            'data' => $session
        ], 201);
    }

    /**
     * Show session detail.
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
}
