<?php

namespace App\Http\Controllers;

use App\Models\LmsAssignment;
use App\Models\LmsFeedbackRevision;
use App\Models\LmsSubmission;
use App\Models\TeachingAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class FeedbackRevisionController extends Controller
{
    public function index(Request $request)
    {
        $teacher = Auth::user()->teacher;

        $query = LmsFeedbackRevision::with(['submission.student', 'submission.assignment', 'teacher'])
            ->where('teacher_id', $teacher->id);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('assignment_id')) {
            $query->whereHas('submission', fn ($q) => $q->where('assignment_id', $request->assignment_id));
        }

        $revisions = $query->latest()->paginate(20)->withQueryString();

        $teachings = TeachingAssignment::with(['subject', 'schoolClass'])
            ->where('teacher_id', $teacher->id)
            ->get()
            ->map(fn ($t) => [
                'subject_id'   => $t->subject_id,
                'subject_name' => $t->subject->name,
                'class_id'     => $t->school_class_id,
                'class_name'   => $t->schoolClass->name,
            ])
            ->unique(fn ($t) => $t['subject_id'] . '-' . $t['class_id'])
            ->values();

        $assignments = LmsAssignment::whereIn('id', $revisions->pluck('submission_id')
            ->map(fn ($id) => LmsSubmission::find($id)?->assignment_id)
            ->filter())
            ->get(['id', 'title']);

        return Inertia::render('feedback-revisions/index', [
            'revisions'   => $revisions,
            'teachings'   => $teachings,
            'assignments' => $assignments,
            'filters'     => $request->only(['status', 'assignment_id']),
        ]);
    }

    public function store(Request $request)
    {
        $teacher = Auth::user()->teacher;

        $validated = $request->validate([
            'submission_id' => 'required|exists:lms_submissions,id',
            'feedback'      => 'required|string|max:2000',
        ]);

        $submission = LmsSubmission::findOrFail($validated['submission_id']);

        $revision = LmsFeedbackRevision::create([
            'submission_id'  => $validated['submission_id'],
            'teacher_id'     => $teacher->id,
            'feedback'       => $validated['feedback'],
            'status'         => 'pending_revision',
            'revision_count' => 0,
        ]);

        $submission->update(['feedback' => $validated['feedback']]);

        return redirect()->back()->with('success', 'Feedback revisi berhasil dikirim.');
    }

    public function update(Request $request, LmsFeedbackRevision $feedbackRevision)
    {
        $teacher = Auth::user()->teacher;

        if ($feedbackRevision->teacher_id !== $teacher->id) {
            abort(403);
        }

        $validated = $request->validate([
            'status'  => 'required|in:pending_revision,revised,approved',
            'feedback' => 'nullable|string|max:2000',
        ]);

        $data = ['status' => $validated['status']];

        if ($request->filled('feedback')) {
            $data['feedback'] = $validated['feedback'];
        }

        if ($validated['status'] === 'revised') {
            $data['revision_count'] = $feedbackRevision->revision_count + 1;
        }

        $feedbackRevision->update($data);

        return redirect()->back()->with('success', 'Status revisi berhasil diperbarui.');
    }

    public function destroy(LmsFeedbackRevision $feedbackRevision)
    {
        $teacher = Auth::user()->teacher;
        if ($feedbackRevision->teacher_id !== $teacher->id) {
            abort(403);
        }

        $feedbackRevision->delete();

        return redirect()->back()->with('success', 'Revisi feedback berhasil dihapus.');
    }
}
