<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\LmsAssignment;
use App\Models\LmsMaterial;
use App\Models\LmsSubmission;
use App\Models\SchoolClass;
use App\Models\Semester;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TeachingAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StudentSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $academicYear = AcademicYear::create([
            'name'      => '2026/2027',
            'is_active' => true,
        ]);
        Semester::create([
            'academic_year_id' => $academicYear->id,
            'name'             => 'Ganjil',
            'semester'         => '1',
            'is_active'        => true,
        ]);
    }

    protected function createTeacherWithUser(string $name = 'Guru Test'): array
    {
        $user = User::factory()->create(['role' => 'teacher', 'name' => $name]);
        $teacher = Teacher::create([
            'user_id' => $user->id,
            'name'    => $name,
            'nip'     => '19800101' . rand(1000, 9999),
        ]);
        return [$user, $teacher];
    }

    protected function createStudentWithUser(string $name, SchoolClass $class): array
    {
        $user = User::factory()->create(['role' => 'student', 'name' => $name]);
        $student = Student::create([
            'user_id'         => $user->id,
            'school_class_id' => $class->id,
            'name'            => $name,
            'nis'             => (string) rand(10000, 99999),
            'unique_id'       => 'STU-' . rand(10000, 99999),
        ]);
        return [$user, $student];
    }

    public function test_student_cannot_inspect_quiz_answer_keys_before_submitting()
    {
        // S1: Sanitizing answer keys from Inertia props
        $class = SchoolClass::create(['name' => 'Kelas 10A']);
        [$teacherUser, $teacher] = $this->createTeacherWithUser('Guru IPA');
        [$studentUser, $student] = $this->createStudentWithUser('Siswa 1', $class);

        $assignment = LmsAssignment::create([
            'teacher_id'      => $teacher->id,
            'subject_id'      => 1,
            'title'           => 'Kuis Fisika Gerak Lurus',
            'description'     => 'Deskripsi Kuis Fisika',
            'max_points'      => 100,
            'assessment_type' => 'formative',
            'instrument_type' => 'formative_quiz',
            'instrument_config' => [
                'questions' => [
                    [
                        'id' => 'q1',
                        'type' => 'multiple_choice',
                        'points' => 50,
                        'question' => 'Apa satuan dari kecepatan?',
                        'answer' => 'opt2',
                        'answer_guide' => 'Penjelasan satuan SI kecepatan adalah m/s.',
                        'options' => [
                            ['id' => 'opt1', 'text' => 'kg', 'is_correct' => false],
                            ['id' => 'opt2', 'text' => 'm/s', 'is_correct' => true],
                        ],
                    ],
                    [
                        'id' => 'q2',
                        'type' => 'short_answer',
                        'points' => 50,
                        'question' => 'Sebutkan hukum gerak Newton yang pertama.',
                        'answer' => 'inersia',
                        'correct_answer' => 'kelembaman / inersia',
                        'answer_guide' => 'Hukum kelembaman menyatakan benda cenderung mempertahankan keadaan diam atau bergeraknya.',
                    ],
                ],
            ],
            'due_date' => now()->addDays(3),
        ]);
        $assignment->schoolClasses()->attach($class->id);

        $response = $this->actingAs($studentUser)->get("/assignments/{$assignment->id}");
        $response->assertStatus(200);

        $response->assertInertia(fn (Assert $page) => $page
            ->component('assignments/show')
            ->missing('assignment.instrument_config.questions.0.answer')
            ->missing('assignment.instrument_config.questions.0.answer_guide')
            ->missing('assignment.instrument_config.questions.0.options.0.is_correct')
            ->missing('assignment.instrument_config.questions.0.options.1.is_correct')
            ->missing('assignment.instrument_config.questions.1.answer')
            ->missing('assignment.instrument_config.questions.1.correct_answer')
            ->missing('assignment.instrument_config.questions.1.answer_guide')
        );
    }

    public function test_student_does_not_receive_classmates_submissions_or_students_list()
    {
        // S2: Data privacy for submissions
        $class = SchoolClass::create(['name' => 'Kelas 10B']);
        [$teacherUser, $teacher] = $this->createTeacherWithUser('Guru Biologi');
        [$studentAUser, $studentA] = $this->createStudentWithUser('Siswa A', $class);
        [$studentBUser, $studentB] = $this->createStudentWithUser('Siswa B', $class);

        $assignment = LmsAssignment::create([
            'teacher_id'      => $teacher->id,
            'subject_id'      => 1,
            'title'           => 'Tugas Laporan Sel',
            'description'     => 'Deskripsi Laporan Sel',
            'max_points'      => 100,
            'assessment_type' => 'formative',
            'due_date'        => now()->addDays(5),
        ]);
        $assignment->schoolClasses()->attach($class->id);

        // Siswa B telah mengumpulkan tugas dengan feedback guru
        LmsSubmission::create([
            'assignment_id' => $assignment->id,
            'student_id'    => $studentB->id,
            'content'       => json_encode(['text' => 'Jawaban rahasia Siswa B']),
            'score'         => 95,
            'feedback'      => 'Sangat baik Siswa B!',
            'submitted_at'  => now(),
        ]);

        // Siswa A melihat halaman tugas
        $response = $this->actingAs($studentAUser)->get("/assignments/{$assignment->id}");
        $response->assertStatus(200);

        // Siswa A tidak boleh menerima array submissions teman sekelas atau daftar students
        $response->assertInertia(fn (Assert $page) => $page
            ->component('assignments/show')
            ->where('assignment.submissions', [])
            ->where('students', [])
            ->where('my_submission', null)
        );

        // Sedangkan Guru harus tetap bisa melihat submission Siswa B
        $responseTeacher = $this->actingAs($teacherUser)->get("/assignments/{$assignment->id}");
        $responseTeacher->assertStatus(200);
        $responseTeacher->assertInertia(fn (Assert $page) => $page
            ->component('assignments/show')
            ->has('assignment.submissions', 1)
            ->where('assignment.submissions.0.student_id', $studentB->id)
        );
    }

    public function test_student_cannot_inject_arbitrary_score_on_submission()
    {
        // S3: Block arbitrary score injection
        $class = SchoolClass::create(['name' => 'Kelas 10C']);
        [$teacherUser, $teacher] = $this->createTeacherWithUser('Guru Kimia');
        [$studentUser, $student] = $this->createStudentWithUser('Siswa C', $class);

        $assignment = LmsAssignment::create([
            'teacher_id'      => $teacher->id,
            'subject_id'      => 1,
            'title'           => 'Tugas Proyek Reaksi Kimia',
            'description'     => 'Deskripsi Proyek',
            'max_points'      => 100,
            'assessment_type' => 'formative',
            'instrument_type' => 'project',
            'due_date'        => now()->addDays(4),
        ]);
        $assignment->schoolClasses()->attach($class->id);

        // Siswa mencoba inject score = 100 secara curang lewat payload request
        $response = $this->actingAs($studentUser)->post("/assignments/{$assignment->id}/submit", [
            'content' => json_encode(['description' => 'Ini hasil karya saya']),
            'score'   => 100,
        ]);
        $response->assertStatus(302);

        $submission = LmsSubmission::where('assignment_id', $assignment->id)
            ->where('student_id', $student->id)
            ->first();

        $this->assertNotNull($submission);
        // Score harus strictly NULL, bukan 100, menunggu koreksi guru
        $this->assertNull($submission->score);
    }

    public function test_cross_class_boundary_authorization_for_assignments_and_materials()
    {
        // S4: Cross-class isolation
        $classA = SchoolClass::create(['name' => 'Kelas X-A']);
        $classB = SchoolClass::create(['name' => 'Kelas X-B']);

        [$teacherUser, $teacher] = $this->createTeacherWithUser('Guru Geografi');
        [$studentAUser, $studentA] = $this->createStudentWithUser('Siswa XA', $classA);
        [$studentBUser, $studentB] = $this->createStudentWithUser('Siswa XB', $classB);

        $assignment = LmsAssignment::create([
            'teacher_id'      => $teacher->id,
            'subject_id'      => 1,
            'title'           => 'Tugas Khusus Kelas X-A',
            'description'     => 'Deskripsi Tugas XA',
            'max_points'      => 100,
            'assessment_type' => 'formative',
            'due_date'        => now()->addDays(2),
        ]);
        $assignment->schoolClasses()->attach($classA->id);

        $material = LmsMaterial::create([
            'teacher_id' => $teacher->id,
            'subject_id' => 1,
            'title'      => 'Materi Khusus Kelas X-A',
            'content'    => 'Penjelasan lapisan bumi.',
        ]);
        $material->schoolClasses()->attach($classA->id);

        // Siswa Kelas B mencoba melihat tugas Kelas A -> 403 Forbidden
        $responseAssignmentShow = $this->actingAs($studentBUser)->get("/assignments/{$assignment->id}");
        $responseAssignmentShow->assertStatus(403);

        // Siswa Kelas B mencoba submit ke tugas Kelas A -> 403 Forbidden
        $responseAssignmentSubmit = $this->actingAs($studentBUser)->post("/assignments/{$assignment->id}/submit", [
            'content' => json_encode(['text' => 'mencoba bypass']),
        ]);
        $responseAssignmentSubmit->assertStatus(403);

        // Siswa Kelas B mencoba melihat materi Kelas A -> 403 Forbidden
        $responseMaterialShow = $this->actingAs($studentBUser)->get("/materials/{$material->id}");
        $responseMaterialShow->assertStatus(403);

        // Sedangkan Siswa Kelas A bisa membuka tugas dan materi dengan normal
        $responseAAssignment = $this->actingAs($studentAUser)->get("/assignments/{$assignment->id}");
        $responseAAssignment->assertStatus(200);

        $responseAMaterial = $this->actingAs($studentAUser)->get("/materials/{$material->id}");
        $responseAMaterial->assertStatus(200);
    }

    public function test_student_dashboard_progress_and_trend_rendering()
    {
        // S5: Dashboard optimization & latest trend
        $class = SchoolClass::create(['name' => 'Kelas X-C']);
        $subject = Subject::create(['name' => 'Bahasa Indonesia', 'code' => 'BIND-10']);
        [$teacherUser, $teacher] = $this->createTeacherWithUser('Guru B. Indo');
        [$studentUser, $student] = $this->createStudentWithUser('Siswa XC', $class);

        TeachingAssignment::create([
            'teacher_id'       => $teacher->id,
            'subject_id'       => $subject->id,
            'school_class_id'  => $class->id,
            'academic_year_id' => 1,
            'semester_id'      => 1,
        ]);

        $assignment1 = LmsAssignment::create([
            'teacher_id'      => $teacher->id,
            'subject_id'      => $subject->id,
            'title'           => 'Tugas 1 Resensi',
            'description'     => 'Deskripsi Resensi',
            'due_date'        => now()->addDays(1),
        ]);
        $assignment1->schoolClasses()->attach($class->id);

        LmsSubmission::create([
            'assignment_id' => $assignment1->id,
            'student_id'    => $student->id,
            'score'         => 88,
            'submitted_at'  => now()->subDays(1),
        ]);

        $response = $this->actingAs($studentUser)->get('/dashboard');
        $response->assertStatus(200);

        $response->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->has('stats.course_progress', 1)
            ->where('stats.course_progress.0.course', 'Bahasa Indonesia')
            ->where('stats.course_progress.0.progress', 100)
            ->has('stats.grade_trend', 1)
            ->where('stats.grade_trend.0.score', 88)
        );
    }
}
