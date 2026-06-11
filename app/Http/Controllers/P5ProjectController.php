<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\LmsP5Dimensi;
use App\Models\LmsP5Project;
use App\Models\LmsP5ProjectScore;
use App\Models\SchoolClass;
use App\Models\Semester;
use App\Models\Student;
use App\Models\TeachingAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class P5ProjectController extends Controller
{
    public function studentIndex()
    {
        $student = Auth::user()->student;
        if (!$student) abort(403);

        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        $projects = LmsP5Project::with(['scores'])
            ->where('school_class_id', $student->school_class_id)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get();

        // Pre-fetch semua dimensi yang dibutuhkan (menghindari N+1 query)
        $allDimensiIds = $projects->pluck('dimensi_ids')->flatten()->unique()->filter()->values()->toArray();
        $allDimensi = LmsP5Dimensi::whereIn('id', $allDimensiIds)
            ->with(['elements.subElements'])
            ->get()
            ->keyBy('id');

        $result = $projects->map(function ($project) use ($student, $allDimensi) {
            // Filter dimensi dari pre-fetched collection berdasarkan project
            $projectDimensiIds = $project->dimensi_ids ?? [];
            $projectSubElementIds = $project->sub_element_ids ?? [];

            $dimensi = collect($projectDimensiIds)
                ->map(fn($id) => $allDimensi->get($id))
                ->filter();

            $studentScores = $project->scores
                ->where('student_id', $student->id)
                ->keyBy('sub_element_id');

            $dimensiData = $dimensi
                ->map(fn($d) => [
                    'id'       => $d->id,
                    'kode'     => $d->kode,
                    'nama'     => $d->nama,
                    'elements' => $d->elements
                        ->map(fn($e) => [
                            'id'           => $e->id,
                            'nama'         => $e->nama,
                            'sub_elements' => $e->subElements
                                ->when(!empty($projectSubElementIds), fn($col) => $col->whereIn('id', $projectSubElementIds))
                                ->map(fn($se) => [
                                    'id'      => $se->id,
                                    'nama'    => $se->nama,
                                    'nilai'   => $studentScores->get($se->id)?->nilai ?? '-',
                                    'catatan' => $studentScores->get($se->id)?->catatan ?? '',
                                ])
                                ->values(),
                        ])
                        ->filter(fn($e) => count($e['sub_elements']) > 0)
                        ->values(),
                ])
                ->filter(fn($d) => !empty($d['elements']))
                ->values();

            return [
                'id' => $project->id,
                'judul' => $project->judul,
                'deskripsi' => $project->deskripsi,
                'tema' => $project->tema,
                'alokasi_waktu' => $project->alokasi_waktu,
                'status' => $project->status,
                'dimensi' => $dimensiData,
            ];
        });

        return Inertia::render('p5/student', [
            'projects' => $result,
            'period' => $activeYear?->name . ' - ' . $activeSemester?->name,
        ]);
    }
    public function index()
    {
        $teacher = Auth::user()->teacher;

        $teachings = TeachingAssignment::with(['subject', 'schoolClass'])
            ->where('teacher_id', $teacher->id)
            ->get()
            ->map(fn($t) => [
                'id'           => $t->id,
                'subject_name' => $t->subject?->name,
                'class_id'     => $t->school_class_id,
                'class_name'   => $t->schoolClass?->name,
            ]);

        $classes = collect($teachings)->unique('class_id')->values();

        $projects = LmsP5Project::with(['schoolClass', 'academicYear', 'semester'])
            ->whereHas('schoolClass', function ($q) use ($teacher) {
                $q->whereIn('id', TeachingAssignment::where('teacher_id', $teacher->id)->pluck('school_class_id'));
            })
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('p5/index', [
            'classes'  => $classes,
            'projects' => $projects,
        ]);
    }

    public function create()
    {
        $teacher = Auth::user()->teacher;
        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        $teachings = TeachingAssignment::with(['subject', 'schoolClass'])
            ->where('teacher_id', $teacher->id)
            ->get()
            ->map(fn($t) => [
                'id'           => $t->id,
                'subject_name' => $t->subject?->name,
                'class_id'     => $t->school_class_id,
                'class_name'   => $t->schoolClass?->name,
            ]);

        $classes = collect($teachings)->unique('class_id')->values();

        $dimensi = LmsP5Dimensi::with('elements.subElements')->get();

        return Inertia::render('p5/create', [
            'classes'      => $classes,
            'dimensi'      => $dimensi,
            'period'       => $activeYear?->name . ' - ' . $activeSemester?->name,
        ]);
    }

    public function store(Request $request)
    {
        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        $validated = $request->validate([
            'judul'          => 'required|string|max:255',
            'deskripsi'      => 'nullable|string',
            'tema'           => 'nullable|string|max:255',
            'school_class_id' => 'required|exists:mysql_absensi.school_classes,id',
            'dimensi_ids'     => 'required|array',
            'dimensi_ids.*'   => 'exists:lms_p5_dimensi,id',
            'sub_element_ids' => 'required|array',
            'sub_element_ids.*' => 'exists:lms_p5_sub_elements,id',
            'alokasi_waktu'   => 'nullable|integer|min:1',
            'status'          => 'required|in:draft,active,selesai',
        ]);

        LmsP5Project::create([
            'judul'           => $validated['judul'],
            'deskripsi'       => $validated['deskripsi'],
            'tema'            => $validated['tema'],
            'school_class_id' => $validated['school_class_id'],
            'academic_year_id' => $activeYear?->id,
            'semester_id'      => $activeSemester?->id,
            'dimensi_ids'      => $validated['dimensi_ids'],
            'sub_element_ids'  => $validated['sub_element_ids'],
            'alokasi_waktu'    => $validated['alokasi_waktu'],
            'status'           => $validated['status'],
        ]);

        return redirect()->route('p5.index')->with('success', 'Projek P5 berhasil dibuat.');
    }

    public function show(LmsP5Project $project)
    {
        $project->load(['schoolClass', 'academicYear', 'semester', 'scores']);

        $dimensi = LmsP5Dimensi::whereIn('id', $project->dimensi_ids ?? [])
            ->with(['elements.subElements' => function ($q) use ($project) {
                if (!empty($project->sub_element_ids)) {
                    $q->whereIn('id', $project->sub_element_ids);
                }
            }])
            ->get()
            ->map(fn($d) => [
                'id'       => $d->id,
                'kode'     => $d->kode,
                'nama'     => $d->nama,
                'elements' => $d->elements
                    ->filter(fn($e) => $e->subElements->isNotEmpty())
                    ->values()
                    ->map(fn($e) => [
                        'id'           => $e->id,
                        'nama'         => $e->nama,
                        'sub_elements' => $e->subElements->values()->map(fn($se) => [
                            'id'         => $se->id,
                            'nama'       => $se->nama,
                            'element_id' => $se->element_id,
                        ]),
                    ]),
            ])
            ->filter(fn($d) => !empty($d['elements']))
            ->values();

        $students = Student::where('school_class_id', $project->school_class_id)
            ->orderBy('name')
            ->get(['id', 'name', 'nis']);

        return Inertia::render('p5/show', [
            'project'  => $project,
            'dimensi'  => $dimensi,
            'students' => $students,
        ]);
    }

    public function edit(LmsP5Project $project)
    {
        $teacher = Auth::user()->teacher;

        $teachings = TeachingAssignment::with(['subject', 'schoolClass'])
            ->where('teacher_id', $teacher->id)
            ->get()
            ->map(fn($t) => [
                'id'           => $t->id,
                'subject_name' => $t->subject?->name,
                'class_id'     => $t->school_class_id,
                'class_name'   => $t->schoolClass?->name,
            ]);

        $classes = collect($teachings)->unique('class_id')->values();

        $dimensi = LmsP5Dimensi::with('elements.subElements')->get();

        return Inertia::render('p5/edit', [
            'project' => $project,
            'classes' => $classes,
            'dimensi' => $dimensi,
        ]);
    }

    public function update(Request $request, LmsP5Project $project)
    {
        $validated = $request->validate([
            'judul'          => 'required|string|max:255',
            'deskripsi'      => 'nullable|string',
            'tema'           => 'nullable|string|max:255',
            'school_class_id' => 'required|exists:mysql_absensi.school_classes,id',
            'dimensi_ids'     => 'required|array',
            'dimensi_ids.*'   => 'exists:lms_p5_dimensi,id',
            'sub_element_ids' => 'required|array',
            'sub_element_ids.*' => 'exists:lms_p5_sub_elements,id',
            'alokasi_waktu'   => 'nullable|integer|min:1',
            'status'          => 'required|in:draft,active,selesai',
        ]);

        $project->update($validated);

        return redirect()->route('p5.index')->with('success', 'Projek P5 berhasil diperbarui.');
    }

    public function destroy(LmsP5Project $project)
    {
        $project->delete();

        return redirect()->route('p5.index')->with('success', 'Projek P5 berhasil dihapus.');
    }

    public function storeScore(Request $request)
    {
        $validated = $request->validate([
            'project_id'     => 'required|exists:lms_p5_projects,id',
            'student_id'     => 'required|exists:mysql_absensi.students,id',
            'sub_element_id' => 'required|exists:lms_p5_sub_elements,id',
            'nilai'          => 'nullable|in:BB,MB,BSH,SB',
            'catatan'        => 'nullable|string',
        ]);

        if (empty($validated['nilai'])) {
            LmsP5ProjectScore::where([
                'project_id'     => $validated['project_id'],
                'student_id'     => $validated['student_id'],
                'sub_element_id' => $validated['sub_element_id'],
            ])->delete();

            return back()->with('success', 'Nilai P5 berhasil dihapus.');
        }

        LmsP5ProjectScore::updateOrCreate(
            [
                'project_id'     => $validated['project_id'],
                'student_id'     => $validated['student_id'],
                'sub_element_id' => $validated['sub_element_id'],
            ],
            [
                'nilai'   => $validated['nilai'],
                'catatan' => $validated['catatan'] ?? null,
            ]
        );

        return back()->with('success', 'Nilai P5 berhasil disimpan.');
    }
}
