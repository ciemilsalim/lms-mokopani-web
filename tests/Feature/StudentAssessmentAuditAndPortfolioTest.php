<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\LmsAssignment;
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

class StudentAssessmentAuditAndPortfolioTest extends TestCase
{
    use RefreshDatabase;

    protected AcademicYear $academicYear;
    protected Semester $semester;
    protected SchoolClass $classA;
    protected Subject $subject;
    protected User $teacherUser;
    protected Teacher $teacher;
    protected User $studentUser;
    protected Student $student;
    protected LmsAssignment $assignment;

    protected function setUp(): void
    {
        parent::setUp();

        $this->academicYear = AcademicYear::create([
            'name'      => '2026/2027',
            'is_active' => true,
        ]);

        $this->semester = Semester::create([
            'academic_year_id' => $this->academicYear->id,
            'name'             => 'Ganjil',
            'semester'         => '1',
            'is_active'        => true,
        ]);

        $this->classA = SchoolClass::create([
            'name'             => 'Kelas 8-A',
            'academic_year_id' => $this->academicYear->id,
        ]);

        $this->subject = Subject::create([
            'name' => 'Informatika',
            'code' => 'INF-8',
        ]);

        $this->teacherUser = User::factory()->create([
            'role' => 'teacher',
            'name' => 'Guru Informatika',
        ]);

        $this->teacher = Teacher::create([
            'user_id' => $this->teacherUser->id,
            'name'    => 'Guru Informatika',
        ]);

        TeachingAssignment::create([
            'teacher_id'       => $this->teacher->id,
            'subject_id'       => $this->subject->id,
            'school_class_id'  => $this->classA->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
        ]);

        $this->studentUser = User::factory()->create([
            'role' => 'student',
            'name' => 'Budi Santoso',
        ]);

        $this->student = Student::create([
            'user_id'         => $this->studentUser->id,
            'name'            => 'Budi Santoso',
            'nis'             => '2026001',
            'unique_id'       => 'STU-2026001',
            'nisn'            => '0012345678',
            'school_class_id' => $this->classA->id,
            'gender'          => 'L',
        ]);

        $this->assignment = LmsAssignment::create([
            'teacher_id'       => $this->teacher->id,
            'subject_id'       => $this->subject->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'title'            => 'Sumatif Algoritma Dasar',
            'description'      => 'Asesmen sumatif algoritma dan logika dasar',
            'type'             => 'task',
            'assessment_type'  => 'summative',
            'passing_grade'    => 75,
            'max_points'       => 100,
            'status'           => 'published',
            'due_date'         => now()->addDays(5),
        ]);
        $this->assignment->schoolClasses()->attach($this->classA->id);

        LmsSubmission::create([
            'assignment_id' => $this->assignment->id,
            'student_id'    => $this->student->id,
            'score'         => 85,
            'feedback'      => 'Sangat baik dan terstruktur',
            'submitted_at'  => now(),
        ]);
    }

    public function test_student_cannot_access_gradebook_student_portfolio(): void
    {
        $response = $this->actingAs($this->studentUser)
            ->get(route('gradebook.student-portfolio', $this->student));

        $response->assertStatus(403);
    }

    public function test_teacher_can_access_gradebook_student_portfolio_json(): void
    {
        $response = $this->actingAs($this->teacherUser)
            ->get(route('gradebook.student-portfolio', [
                'student'    => $this->student->id,
                'subject_id' => $this->subject->id,
            ]));

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'student' => [
                'id',
                'name',
                'nis',
                'photo_url',
                'class_name',
                'class_id',
            ],
            'subjects',
            'active_subject' => [
                'id',
                'name',
            ],
            'kktp',
            'period',
            'portfolio',
            'summary' => [
                'total_assignments',
                'total_submitted',
                'total_graded',
                'average_score',
                'passed_count',
                'remedial_count',
                'unsubmitted_count',
            ],
        ]);

        $data = $response->json();
        $this->assertEquals(85, $data['summary']['average_score']);
        $this->assertEquals(1, $data['summary']['passed_count']);
        $this->assertEquals(0, $data['summary']['remedial_count']);
        $this->assertCount(1, $data['portfolio']);
        $this->assertEquals(true, $data['portfolio'][0]['is_passed']);
    }

    public function test_teacher_can_view_grade_split_with_ketuntasan_metadata(): void
    {
        $response = $this->actingAs($this->teacherUser)
            ->get(route('assignments.grade-view', $this->assignment));

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('assignments/grade-split')
            ->has('assignment')
            ->where('assignment.passing_grade', 75)
            ->where('assignment.assessment_type', 'summative')
            ->has('assignment.submissions', 1)
            ->where('assignment.submissions.0.is_passed', true)
        );
    }

    public function test_formative_assessment_remedial_and_tuntas_thresholds(): void
    {
        $formative = LmsAssignment::create([
            'teacher_id'       => $this->teacher->id,
            'subject_id'       => $this->subject->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'title'            => 'Formatif Kuis Algoritma',
            'description'      => 'Kuis formatif algoritma dasar',
            'type'             => 'quiz',
            'assessment_type'  => 'formative',
            'max_points'       => 100,
            'status'           => 'published',
            'due_date'         => now()->addDays(3),
        ]);
        $formative->schoolClasses()->attach($this->classA->id);

        // Nilai 0 - 79 adalah Remedial
        $this->assertFalse($formative->evaluateKetuntasan(null, 0));
        $this->assertFalse($formative->evaluateKetuntasan(null, 50));
        $this->assertFalse($formative->evaluateKetuntasan(null, 79));
        $this->assertFalse($formative->evaluateKetuntasan(null, 79.9));

        // Nilai 80 - 100 adalah Tuntas
        $this->assertTrue($formative->evaluateKetuntasan(null, 80));
        $this->assertTrue($formative->evaluateKetuntasan(null, 85));
        $this->assertTrue($formative->evaluateKetuntasan(null, 100));

        // Response grade-view & show automatically set passing_grade to 80 for formative
        $response = $this->actingAs($this->teacherUser)
            ->get(route('assignments.grade-view', $formative));
        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->where('assignment.passing_grade', 80)
            ->where('assignment.assessment_type', 'formative')
        );
    }
}
