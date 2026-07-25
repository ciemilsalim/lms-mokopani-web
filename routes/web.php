<?php

use App\Http\Controllers\AssignmentController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LmsModulAjarController;
use App\Http\Controllers\MaterialController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\SubjectController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\GradebookController;
use App\Http\Controllers\ParentController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\P5ProjectController;
use App\Http\Controllers\RaporController;
use App\Http\Controllers\CapaianPembelajaranController;
use App\Http\Controllers\LmsPromptController;
use App\Http\Controllers\AcademicPeriodController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }
    return redirect()->route('login');
})->name('home');

Route::get('/sso/login', [\App\Http\Controllers\Auth\SsoLoginController::class, 'login'])->name('sso.login');
Route::get('/sso/presensi', [\App\Http\Controllers\SSOController::class, 'redirectToPresensi'])->name('sso.presensi');

Route::get('/clear-cache', function() {
    \Illuminate\Support\Facades\Artisan::call('optimize:clear');
    return 'Cache cleared successfully! Silakan refresh halaman utama LMS.';
});

Route::middleware(['auth'])->group(function () {
    // ── Notifications ──────────────────────────────────────────────
    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('notifications/{notification}/read', [NotificationController::class, 'read'])->name('notifications.read');
    Route::post('notifications/read-all', [NotificationController::class, 'readAll'])->name('notifications.read-all');

    // ── Global Semester Switch ──────────────────────────────────────
    Route::post('/academic-periods/switch', [AcademicPeriodController::class, 'switch'])->name('academic-periods.switch');

    // ── Shared (all authenticated roles) ────────────────────────────
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('guide', function () { return Inertia::render('guide'); })->name('guide');

    Route::get('materials', [MaterialController::class, 'index'])->name('materials.index');
    Route::get('materials/create', [MaterialController::class, 'create'])->name('materials.create')->middleware('role:admin,teacher');
    Route::get('materials/{material}', [MaterialController::class, 'show'])->name('materials.show');

    Route::get('subjects', [SubjectController::class, 'index'])->name('subjects.index');
    Route::get('subjects/{subject}', [SubjectController::class, 'show'])->name('subjects.show');

    Route::get('assignments', [AssignmentController::class, 'index'])->name('assignments.index');
    Route::get('assignments/create', [AssignmentController::class, 'create'])->name('assignments.create')->middleware('role:admin,teacher');
    Route::get('assignments/{assignment}', [AssignmentController::class, 'show'])->name('assignments.show');

    Route::get('announcements', [AnnouncementController::class, 'index'])->name('announcements.index');

    // Projek P5 untuk siswa
    Route::get('p5/saya', [P5ProjectController::class, 'studentIndex'])->name('p5.student');

    // Komentar (all roles can comment)
    Route::post('comments', [\App\Http\Controllers\CommentController::class, 'store'])->name('comments.store');
    Route::delete('comments/{comment}', [\App\Http\Controllers\CommentController::class, 'destroy'])->name('comments.destroy');

    // Laporan Nilai & Sesi Kelas (shared — dispatches teacher vs student in controller)
    Route::get('gradebook', [\App\Http\Controllers\GradebookController::class, 'index'])->name('gradebook.index');
    Route::get('class-sessions', [\App\Http\Controllers\ClassSessionController::class, 'index'])->name('class-sessions.index');

    // ── Student-only ────────────────────────────────────────────────
    Route::middleware(['role:student'])->group(function () {
        Route::get('class-sessions/{id}/student', [\App\Http\Controllers\ClassSessionController::class, 'studentLive'])->name('class-sessions.student-live');
        Route::post('assignments/{assignment}/submit', [AssignmentController::class, 'submit'])->name('assignments.submit');
        Route::post('reflections', [\App\Http\Controllers\ReflectionController::class, 'store'])->name('reflections.store');
        Route::post('materials/{material}/complete', [MaterialController::class, 'complete'])->name('materials.complete');
    });

    // ── Teacher-only ────────────────────────────────────────────────
    Route::middleware(['role:admin,teacher'])->group(function () {
        // Pembelajaran (Modul Ajar / RPP PPA 2026)
        Route::get('lesson-plans', [LmsModulAjarController::class, 'index'])->name('lesson-plans.index');
        Route::get('lesson-plans/create', [LmsModulAjarController::class, 'create'])->name('lesson-plans.create');
        Route::post('lesson-plans', [LmsModulAjarController::class, 'store'])->name('lesson-plans.store');
        Route::get('lesson-plans/{lesson_plan}', [LmsModulAjarController::class, 'show'])->name('lesson-plans.show');
        Route::get('lesson-plans/{lesson_plan}/edit', [LmsModulAjarController::class, 'edit'])->name('lesson-plans.edit');
        Route::put('lesson-plans/{lesson_plan}', [LmsModulAjarController::class, 'update'])->name('lesson-plans.update');
        Route::delete('lesson-plans/{lesson_plan}', [LmsModulAjarController::class, 'destroy'])->name('lesson-plans.destroy');
        Route::post('lesson-plans/generate', [LmsModulAjarController::class, 'generate'])->name('lesson-plans.generate');
        Route::post('lesson-plans/get-assessments', [LmsModulAjarController::class, 'getAssessments'])->name('lesson-plans.get-assessments');
        Route::post('instructional-design/auto-suggest', [LmsModulAjarController::class, 'autoSuggest'])->name('instructional-design.auto-suggest');
        Route::get('lesson-plans/prompts/all', [LmsPromptController::class, 'index'])->name('lesson-plans.prompts.get');
        Route::post('lesson-plans/prompts/save', [LmsPromptController::class, 'store'])->name('lesson-plans.prompts.save');
        Route::post('lesson-plans/prompts/reset', [LmsPromptController::class, 'reset'])->name('lesson-plans.prompts.reset');

        // Wizard Modul Ajar (Shadcn UI & PPA 2025)
        Route::get('modul-ajar/wizard', [LmsModulAjarController::class, 'wizard'])->name('modul-ajar.wizard');
        Route::post('api/ai/suggest-tp', [\App\Http\Controllers\LmsAiWizardController::class, 'suggestTp'])->name('ai.suggest-tp');
        Route::post('api/ai/suggest-atp', [\App\Http\Controllers\LmsAiWizardController::class, 'suggestAtp'])->name('ai.suggest-atp');
        Route::post('api/ai/generate-kktp', [\App\Http\Controllers\LmsAiWizardController::class, 'generateKktp'])->name('ai.generate-kktp');
        Route::post('api/ai/generate-illustration', [\App\Http\Controllers\LmsAiWizardController::class, 'generateIllustration'])->name('ai.generate-illustration');

        // Materi CRUD (create/delete)
        Route::post('materials', [MaterialController::class, 'store'])->name('materials.store');
        Route::get('materials/{material}/edit', [MaterialController::class, 'edit'])->name('materials.edit');
        Route::post('materials/{material}', [MaterialController::class, 'update'])->name('materials.update');
        Route::delete('materials/{material}', [MaterialController::class, 'destroy'])->name('materials.destroy');
        Route::post('materials/{material}/toggle-lock', [MaterialController::class, 'toggleLock'])->name('materials.toggle-lock');

        // Asesmen CRUD (create/edit/delete/grade)
        Route::post('assignments', [AssignmentController::class, 'store'])->name('assignments.store');
        Route::get('assignments/{assignment}/edit', [AssignmentController::class, 'edit'])->name('assignments.edit');
        Route::get('assignments/{assignment}/grade-view', [AssignmentController::class, 'gradeView'])->name('assignments.grade-view');
        Route::post('assignments/{assignment}/upload-proof', [AssignmentController::class, 'uploadProof'])->name('assignments.upload-proof');
        Route::post('assignments/grade', [AssignmentController::class, 'grade'])->name('assignments.grade');
        Route::post('assignments/open-remedial', [AssignmentController::class, 'openRemedial'])->name('assignments.open_remedial');
        Route::post('assignments/{assignment}', [AssignmentController::class, 'update'])->name('assignments.update');
        Route::delete('assignments/{assignment}', [AssignmentController::class, 'destroy'])->name('assignments.destroy');

        // Tujuan Pembelajaran (TP)
        Route::get('learning-objectives', [\App\Http\Controllers\LearningObjectiveController::class, 'index'])->name('learning-objectives.index');
        Route::post('learning-objectives', [\App\Http\Controllers\LearningObjectiveController::class, 'store'])->name('learning-objectives.store');
        Route::put('learning-objectives/{objective}', [\App\Http\Controllers\LearningObjectiveController::class, 'update'])->name('learning-objectives.update');
        Route::delete('learning-objectives/{objective}', [\App\Http\Controllers\LearningObjectiveController::class, 'destroy'])->name('learning-objectives.destroy');
        Route::post('learning-objectives/order', [\App\Http\Controllers\LearningObjectiveController::class, 'updateOrder'])->name('learning-objectives.update-order');
        Route::post('learning-objectives/auto-suggest', [\App\Http\Controllers\LearningObjectiveController::class, 'autoSuggest'])->name('learning-objectives.auto-suggest');
        Route::post('learning-objectives/auto-sequence', [\App\Http\Controllers\LearningObjectiveController::class, 'autoSequence'])->name('learning-objectives.auto-sequence');
        Route::post('learning-objectives/auto-breakdown', [\App\Http\Controllers\LearningObjectiveController::class, 'autoBreakdown'])->name('learning-objectives.auto-breakdown');

        // Laporan Nilai (Gradebook) — detail views teacher-only
        Route::get('gradebook/show', [\App\Http\Controllers\GradebookController::class, 'show'])->name('gradebook.show');
        Route::get('gradebook/final-report', [\App\Http\Controllers\GradebookController::class, 'finalReport'])->name('gradebook.final-report');
        Route::post('gradebook/final-score', [\App\Http\Controllers\GradebookController::class, 'updateFinalScore'])->name('gradebook.final-score.update');

        // Laporan Capaian Pembelajaran (read-only report)
        Route::get('gradebook/learning-report/{class_id}/{subject_id}', [GradebookController::class, 'learningReport'])->name('gradebook.learning-report');

        // E-Rapor (PDF)
        Route::get('rapor/preview', [RaporController::class, 'preview'])->name('rapor.preview');
        Route::get('rapor/download', [RaporController::class, 'download'])->name('rapor.download');

        // Pengumuman CRUD
        Route::post('announcements', [AnnouncementController::class, 'store'])->name('announcements.store');
        Route::get('announcements/{announcement}/edit', [AnnouncementController::class, 'edit'])->name('announcements.edit');
        Route::post('announcements/{announcement}', [AnnouncementController::class, 'update'])->name('announcements.update');
        Route::delete('announcements/{announcement}', [AnnouncementController::class, 'destroy'])->name('announcements.destroy');

        // Data siswa
        Route::get('students', [StudentController::class, 'index'])->name('students.index');

        // Capaian Pembelajaran (CP)
        Route::get('cp', [CapaianPembelajaranController::class, 'index'])->name('cp.index');
        Route::post('cp', [CapaianPembelajaranController::class, 'store'])->name('cp.store');
        Route::put('cp/{capaianPembelajaran}', [CapaianPembelajaranController::class, 'update'])->name('cp.update');
        Route::delete('cp/{capaianPembelajaran}', [CapaianPembelajaranController::class, 'destroy'])->name('cp.destroy');

        // Projek Penguatan P5
        Route::get('p5', [P5ProjectController::class, 'index'])->name('p5.index');
        Route::get('p5/create', [P5ProjectController::class, 'create'])->name('p5.create');
        Route::post('p5', [P5ProjectController::class, 'store'])->name('p5.store');
        Route::post('p5/score', [P5ProjectController::class, 'storeScore'])->name('p5.score.store');
        Route::get('p5/{project}', [P5ProjectController::class, 'show'])->name('p5.show');
        Route::get('p5/{project}/edit', [P5ProjectController::class, 'edit'])->name('p5.edit');
        Route::post('p5/{project}', [P5ProjectController::class, 'update'])->name('p5.update');
        Route::delete('p5/{project}', [P5ProjectController::class, 'destroy'])->name('p5.destroy');

        // Remedial & Pengayaan
        Route::get('remedial', [\App\Http\Controllers\RemedialRecordController::class, 'index'])->name('remedial.index');
        Route::get('remedial/create', [\App\Http\Controllers\RemedialRecordController::class, 'create'])->name('remedial.create');
        Route::get('remedial/eligible', [\App\Http\Controllers\RemedialRecordController::class, 'eligible'])->name('remedial.eligible');
        Route::post('remedial', [\App\Http\Controllers\RemedialRecordController::class, 'store'])->name('remedial.store');
        Route::get('remedial/{remedial}/edit', [\App\Http\Controllers\RemedialRecordController::class, 'edit'])->name('remedial.edit');
        Route::post('remedial/{remedial}', [\App\Http\Controllers\RemedialRecordController::class, 'update'])->name('remedial.update');
        Route::delete('remedial/{remedial}', [\App\Http\Controllers\RemedialRecordController::class, 'destroy'])->name('remedial.destroy');

        // Diagnostik Non-Kognitif
        Route::get('non-cognitive', [\App\Http\Controllers\NonCognitiveDiagnosticController::class, 'index'])->name('non-cognitive.index');
        Route::get('non-cognitive/{student}/edit', [\App\Http\Controllers\NonCognitiveDiagnosticController::class, 'edit'])->name('non-cognitive.edit');
        Route::post('non-cognitive/{student}', [\App\Http\Controllers\NonCognitiveDiagnosticController::class, 'update'])->name('non-cognitive.update');

        // Feedback Revisions
        Route::get('feedback-revisions', [\App\Http\Controllers\FeedbackRevisionController::class, 'index'])->name('feedback-revisions.index');
        Route::post('feedback-revisions', [\App\Http\Controllers\FeedbackRevisionController::class, 'store'])->name('feedback-revisions.store');
        Route::post('feedback-revisions/{feedbackRevision}', [\App\Http\Controllers\FeedbackRevisionController::class, 'update'])->name('feedback-revisions.update');
        Route::delete('feedback-revisions/{feedbackRevision}', [\App\Http\Controllers\FeedbackRevisionController::class, 'destroy'])->name('feedback-revisions.destroy');

        // Early Warning System
        Route::get('early-warning', [\App\Http\Controllers\EarlyWarningController::class, 'index'])->name('early-warning.index');
        Route::get('early-warning/{subject}/{class}', [\App\Http\Controllers\EarlyWarningController::class, 'show'])->name('early-warning.show');
        Route::get('early-warning/{subject}/student/{student}', [\App\Http\Controllers\EarlyWarningController::class, 'student'])->name('early-warning.student');

        // Analitik Pembelajaran
        Route::get('analytics', [AnalyticsController::class, 'index'])->name('analytics.index');
        Route::get('analytics/{subjectId}/{classId}', [AnalyticsController::class, 'show'])->name('analytics.show');

        // Class Sessions (PPA 2025 Execution)
        Route::get('class-sessions/{id}/live', [\App\Http\Controllers\ClassSessionController::class, 'live'])->name('class-sessions.live');
        Route::post('api/ai/generate-learning-steps', [\App\Http\Controllers\ClassSessionController::class, 'generateLearningSteps'])->name('ai.generate-learning-steps');

        // Rapor Processing (PPA 2025 Summative Calculation)
        Route::get('rapor/wizard', [\App\Http\Controllers\RaporReportController::class, 'wizard'])->name('rapor.wizard');
        Route::post('rapor/generate', [\App\Http\Controllers\RaporReportController::class, 'generate'])->name('rapor.generate');
        Route::get('rapor/{id}', [\App\Http\Controllers\RaporReportController::class, 'show'])->name('rapor.show');
        Route::get('rapor/{id}/export/pdf', [\App\Http\Controllers\RaporReportController::class, 'exportPdf'])->name('rapor.export-pdf');
        Route::get('rapor/{id}/export/csv', [\App\Http\Controllers\RaporReportController::class, 'exportCsv'])->name('rapor.export-csv');
        Route::post('api/rapor/generate-description', [\App\Http\Controllers\RaporReportController::class, 'generateAiDescription'])->name('api.rapor.generate-description');

        // Admin AI Analytics & Weighting Settings
        Route::get('admin/ai-analytics', [\App\Http\Controllers\AdminAiAnalyticsController::class, 'index'])->name('admin.ai-analytics.index');
        Route::post('admin/ai-analytics/settings', [\App\Http\Controllers\AdminAiAnalyticsController::class, 'updateSettings'])->name('admin.ai-analytics.update-settings');
    });

    // ── Parent-only ─────────────────────────────────────────────────
    Route::middleware(['role:parent'])->group(function () {
        Route::get('parent/dashboard', [ParentController::class, 'dashboard'])->name('parent.dashboard');
        Route::get('parent/child/{student}', [ParentController::class, 'child'])->name('parent.child');
    });

    // ── Adaptive Learning (shared) ─────────────────────────────────
    Route::get('adaptive-learning', [\App\Http\Controllers\AdaptiveLearningController::class, 'index'])->name('adaptive-learning.index');
    Route::get('adaptive-learning/{subject}/{class}/students', [\App\Http\Controllers\AdaptiveLearningController::class, 'students'])->name('adaptive-learning.students');
    Route::get('adaptive-learning/{subject}/{student}', [\App\Http\Controllers\AdaptiveLearningController::class, 'summary'])->name('adaptive-learning.summary');

    // ── Admin-only ──────────────────────────────────────────────────
    Route::middleware(['role:admin'])->group(function () {
        Route::get('teachers', [\App\Http\Controllers\TeacherController::class, 'index'])->name('teachers.index');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
