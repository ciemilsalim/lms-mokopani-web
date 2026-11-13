<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\GradebookFinalScore;
use App\Models\LmsAssignment;
use App\Models\LmsP5Dimensi;
use App\Models\LmsP5Element;
use App\Models\LmsP5Project;
use App\Models\LmsP5ProjectScore;
use App\Models\LmsP5SubElement;
use App\Models\LmsSubmission;
use App\Models\SchoolClass;
use App\Models\Semester;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StudentGradebookAuditTest extends TestCase
{
    use RefreshDatabase;

    protected AcademicYear $academicYear;
    protected Semester $semester;
    protected SchoolClass $schoolClass;
    protected Teacher $teacher;
    protected User $studentUser;
    protected Student $student;

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

        $this->schoolClass = SchoolClass::create(['name' => 'Kelas X-1']);

        $teacherUser = User::factory()->create(['role' => 'teacher', 'name' => 'Guru Audit']);
        $this->teacher = Teacher::create([
            'user_id' => $teacherUser->id,
            'name'    => 'Guru Audit',
            'nip'     => '198501012010011001',
        ]);

        $this->studentUser = User::factory()->create(['role' => 'student', 'name' => 'Siswa Audit']);
        $this->student = Student::create([
            'user_id'         => $this->studentUser->id,
            'school_class_id' => $this->schoolClass->id,
            'name'            => 'Siswa Audit',
            'nis'             => '2026001',
            'unique_id'       => 'STU-2026001',
        ]);
    }

    public function test_student_gradebook_maps_p5_project_fields_and_filters_sub_elements(): void
    {
        $dimensi = LmsP5Dimensi::create([
            'kode' => 'D1',
            'nama' => 'Beriman, Bertakwa kepada Tuhan YME',
        ]);

        $element = LmsP5Element::create([
            'dimensi_id' => $dimensi->id,
            'nama'       => 'Akhlak Beragama',
        ]);

        $sub1 = LmsP5SubElement::create([
            'element_id' => $element->id,
            'nama'       => 'Mengenal dan Mencintai Tuhan YME',
        ]);

        $sub2 = LmsP5SubElement::create([
            'element_id' => $element->id,
            'nama'       => 'Pemahaman Agama/Kepercayaan',
        ]);

        $project = LmsP5Project::create([
            'judul'            => 'Projek Gaya Hidup Berkelanjutan',
            'deskripsi'        => 'Pengolahan sampah organik sekolah.',
            'tema'             => 'Gaya Hidup Berkelanjutan',
            'school_class_id'  => $this->schoolClass->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'dimensi_ids'      => [$dimensi->id],
            'sub_element_ids'  => [$sub1->id],
            'alokasi_waktu'    => 36,
            'status'           => 'active',
        ]);

        LmsP5ProjectScore::create([
            'project_id'     => $project->id,
            'student_id'     => $this->student->id,
            'sub_element_id' => $sub1->id,
            'nilai'          => 'BSH',
            'catatan'        => 'Aktif dalam diskusi kelompok.',
        ]);

        $response = $this->actingAs($this->studentUser)->get('/gradebook');
        $response->assertStatus(200);

        $response->assertInertia(fn (Assert $page) => $page
            ->component('gradebook/student')
            ->has('p5_projects', 1)
            ->where('p5_projects.0.judul', 'Projek Gaya Hidup Berkelanjutan')
            ->where('p5_projects.0.deskripsi', 'Pengolahan sampah organik sekolah.')
            ->where('p5_projects.0.tema', 'Gaya Hidup Berkelanjutan')
            ->where('p5_projects.0.alokasi_waktu', 36)
            ->where('p5_projects.0.status', 'active')
            ->has('p5_projects.0.dimensi.0.elements.0.sub_elements', 1)
            ->where('p5_projects.0.dimensi.0.elements.0.sub_elements.0.id', $sub1->id)
            ->where('p5_projects.0.dimensi.0.elements.0.sub_elements.0.nilai', 'BSH')
            ->where('p5_projects.0.dimensi.0.elements.0.sub_elements.0.catatan', 'Aktif dalam diskusi kelompok.')
        );
    }

    public function test_student_gradebook_exposes_subject_kktp_and_handles_formative_only_and_sas_only_subjects(): void
    {
        $subjectFormativeOnly = Subject::create([
            'name' => 'Seni Budaya',
            'code' => 'SB-10',
            'kktp' => 68,
        ]);

        $subjectSasOnly = Subject::create([
            'name' => 'Matematika',
            'code' => 'MAT-10',
            'kktp' => 75,
        ]);

        $asmFormative = LmsAssignment::create([
            'teacher_id'       => $this->teacher->id,
            'subject_id'       => $subjectFormativeOnly->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'title'            => 'Latihan Sketsa',
            'description'      => 'Latihan menggambar',
            'assessment_type'  => 'formative',
            'max_points'       => 100,
        ]);
        $asmFormative->schoolClasses()->attach($this->schoolClass->id);

        GradebookFinalScore::create([
            'student_id'       => $this->student->id,
            'subject_id'       => $subjectSasOnly->id,
            'school_class_id'  => $this->schoolClass->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'score'            => 88,
        ]);

        $response = $this->actingAs($this->studentUser)->get('/gradebook');
        $response->assertStatus(200);

        $response->assertInertia(fn (Assert $page) => $page
            ->component('gradebook/student')
            ->has('report', 2)
            ->where('report.0.subject_id', $subjectFormativeOnly->id)
            ->where('report.0.kktp', 68)
            ->where('report.0.has_summative_data', false)
            ->where('report.1.subject_id', $subjectSasOnly->id)
            ->where('report.1.kktp', 75)
            ->where('report.1.has_summative_data', true)
            ->where('report.1.sas_score', 88)
            ->where('report.1.average', 88)
        );
    }

    public function test_student_gradebook_distinguishes_ungraded_submission_from_unsubmitted(): void
    {
        $subject = Subject::create([
            'name' => 'Bahasa Inggris',
            'code' => 'BING-10',
        ]);

        $asmSubmitted = LmsAssignment::create([
            'teacher_id'       => $this->teacher->id,
            'subject_id'       => $subject->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'title'            => 'Essay Reading',
            'description'      => 'Essay',
            'assessment_type'  => 'formative',
            'max_points'       => 100,
        ]);
        $asmSubmitted->schoolClasses()->attach($this->schoolClass->id);

        LmsSubmission::create([
            'assignment_id' => $asmSubmitted->id,
            'student_id'    => $this->student->id,
            'score'         => null,
            'submitted_at'  => now(),
        ]);

        $asmUnsubmitted = LmsAssignment::create([
            'teacher_id'       => $this->teacher->id,
            'subject_id'       => $subject->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'title'            => 'Listening Quiz',
            'description'      => 'Listening',
            'assessment_type'  => 'summative',
            'max_points'       => 100,
        ]);
        $asmUnsubmitted->schoolClasses()->attach($this->schoolClass->id);

        $response = $this->actingAs($this->studentUser)->get('/gradebook');
        $response->assertStatus(200);

        $response->assertInertia(fn (Assert $page) => $page
            ->component('gradebook/student')
            ->where('report.0.cps.0.tps.0.assignments.0.status', 'Menunggu Penilaian')
            ->where('report.0.cps.0.tps.0.assignments.0.score', '-')
            ->where('report.0.cps.0.tps.0.assignments.1.status', 'Belum Mengerjakan')
            ->where('report.0.cps.0.tps.0.assignments.1.score', '-')
        );
    }
}
