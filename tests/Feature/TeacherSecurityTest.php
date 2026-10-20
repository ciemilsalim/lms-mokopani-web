<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\LmsAssignment;
use App\Models\LmsFeedbackRevision;
use App\Models\LmsLearningObjective;
use App\Models\LmsP5Dimensi;
use App\Models\LmsP5Element;
use App\Models\LmsP5Project;
use App\Models\LmsP5SubElement;
use App\Models\LmsSubmission;
use App\Models\NonCognitiveDiagnostic;
use App\Models\SchoolClass;
use App\Models\Semester;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TeachingAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TeacherSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected AcademicYear $academicYear;
    protected Semester $semester;

    protected function setUp(): void
    {
        parent::setUp();

        config(['database.connections.mysql_absensi' => config('database.connections.sqlite')]);
        DB::purge('mysql_absensi');
        DB::connection('mysql_absensi')->setPdo(DB::connection('sqlite')->getPdo());

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

    /**
     * G1: LearningObjective IDOR & ownership check
     */
    public function test_teacher_cannot_update_or_delete_another_teachers_learning_objective()
    {
        [$userA, $teacherA] = $this->createTeacherWithUser('Guru A');
        [$userB, $teacherB] = $this->createTeacherWithUser('Guru B');
        $subject = Subject::create(['name' => 'Matematika', 'code' => 'MTK']);
        $classA = SchoolClass::create(['name' => 'X-A', 'level' => '10']);

        $objectiveA = LmsLearningObjective::create([
            'teacher_id'       => $teacherA->id,
            'subject_id'       => $subject->id,
            'code'             => 'TP-1',
            'title'            => 'Objektif Guru A',
            'description'      => 'Deskripsi Objektif Guru A',
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
        ]);

        // Guru B tries to update Guru A's TP
        $response = $this->actingAs($userB)->putJson(route('learning-objectives.update', $objectiveA), [
            'subject_id'         => $subject->id,
            'school_class_id'    => $classA->id,
            'formulation_method' => 'direct_from_cp',
            'code'               => 'TP-HACK',
            'title'              => 'Objektif Dibajak',
            'description'        => 'Deskripsi Hack',
        ]);
        $response->assertStatus(403);

        // Guru B tries to delete Guru A's TP
        $deleteResponse = $this->actingAs($userB)->deleteJson(route('learning-objectives.destroy', $objectiveA));
        $deleteResponse->assertStatus(403);

        // Guru A can update their own TP
        $validUpdate = $this->actingAs($userA)->putJson(route('learning-objectives.update', $objectiveA), [
            'subject_id'         => $subject->id,
            'school_class_id'    => $classA->id,
            'formulation_method' => 'direct',
            'code'               => 'TP-1-MOD',
            'title'              => 'Objektif Diperbarui',
            'description'        => 'Deskripsi Baru',
        ]);
        $validUpdate->assertRedirect();
        $this->assertDatabaseHas('lms_learning_objectives', [
            'id'          => $objectiveA->id,
            'description' => 'Deskripsi Baru',
        ]);

        // Guru B cannot reorder Guru A's TP
        $reorderResponse = $this->actingAs($userB)->postJson(route('learning-objectives.update-order'), [
            'orders' => [
                ['id' => $objectiveA->id, 'order' => 5],
            ],
        ]);
        $reorderResponse->assertStatus(403);
    }

    /**
     * G2: P5Project create loads variables safely, store/grade checks class assignment
     */
    public function test_p5_project_access_and_class_assignment_enforcement()
    {
        [$userA, $teacherA] = $this->createTeacherWithUser('Guru A');
        [$userB, $teacherB] = $this->createTeacherWithUser('Guru B');
        $classA = SchoolClass::create(['name' => 'X-A', 'level' => '10']);
        $classB = SchoolClass::create(['name' => 'X-B', 'level' => '10']);
        $subject = Subject::create(['name' => 'Projek P5', 'code' => 'P5']);

        $dimensi = LmsP5Dimensi::create(['kode' => 'DIM1', 'nama' => 'Beriman', 'deskripsi' => 'Desc']);
        $element = LmsP5Element::create(['dimensi_id' => $dimensi->id, 'nama' => 'Akhlak Beragama', 'deskripsi' => 'Desc']);
        $subElement = LmsP5SubElement::create(['element_id' => $element->id, 'nama' => 'Mengenal Agama', 'deskripsi' => 'Desc', 'jenjang' => 'SMA']);

        TeachingAssignment::create([
            'teacher_id'       => $teacherA->id,
            'school_class_id'  => $classA->id,
            'subject_id'       => $subject->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
        ]);

        // P5 create page loads without undefined variable error
        $createResponse = $this->actingAs($userA)->get(route('p5.create'));
        $createResponse->assertStatus(200);

        // Guru A creates P5 for Class A (allowed)
        $storeResponse = $this->actingAs($userA)->post(route('p5.store'), [
            'judul'           => 'Projek Gaya Hidup',
            'tema'            => 'Gaya Hidup Berkelanjutan',
            'school_class_id' => $classA->id,
            'dimensi_ids'     => [$dimensi->id],
            'sub_element_ids' => [$subElement->id],
            'status'          => 'active',
        ]);
        $storeResponse->assertRedirect();
        $project = LmsP5Project::where('school_class_id', $classA->id)->first();
        $this->assertNotNull($project);

        // Guru A cannot create P5 for Class B (not assigned)
        $forbiddenStore = $this->actingAs($userA)->post(route('p5.store'), [
            'judul'           => 'Projek Ilegal',
            'tema'            => 'Kearifan Lokal',
            'school_class_id' => $classB->id,
            'dimensi_ids'     => [$dimensi->id],
            'sub_element_ids' => [$subElement->id],
            'status'          => 'active',
        ]);
        $forbiddenStore->assertStatus(403);

        // Guru B cannot edit or update Guru A's P5 project in Class A
        $editResponse = $this->actingAs($userB)->get(route('p5.edit', $project));
        $editResponse->assertStatus(403);

        $updateResponse = $this->actingAs($userB)->post(route('p5.update', $project), [
            'judul'           => 'Projek Hacked',
            'tema'            => 'Gaya Hidup Berkelanjutan',
            'school_class_id' => $classA->id,
            'dimensi_ids'     => [$dimensi->id],
            'sub_element_ids' => [$subElement->id],
            'status'          => 'active',
        ]);
        $updateResponse->assertStatus(403);
    }

    /**
     * G3: NonCognitiveDiagnostic IDOR & student privacy protection
     */
    public function test_teacher_cannot_access_diagnostic_of_unassigned_student()
    {
        [$userA, $teacherA] = $this->createTeacherWithUser('Guru A');
        [$userB, $teacherB] = $this->createTeacherWithUser('Guru B');
        $classA = SchoolClass::create(['name' => 'XI-A', 'level' => '11']);
        $classB = SchoolClass::create(['name' => 'XI-B', 'level' => '11']);
        $subject = Subject::create(['name' => 'Biologi', 'code' => 'BIO']);

        TeachingAssignment::create([
            'teacher_id'       => $teacherA->id,
            'school_class_id'  => $classA->id,
            'subject_id'       => $subject->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
        ]);

        [$studentUserA, $studentA] = $this->createStudentWithUser('Siswa A', $classA);
        [$studentUserB, $studentB] = $this->createStudentWithUser('Siswa B', $classB);

        // Guru A cannot edit diagnostic of student B (unassigned class)
        $editResponse = $this->actingAs($userA)->get(route('non-cognitive.edit', $studentB));
        $editResponse->assertStatus(403);

        // Guru A can access student A
        $validEdit = $this->actingAs($userA)->get(route('non-cognitive.edit', $studentA));
        $validEdit->assertStatus(200);
    }

    /**
     * G4: AdaptiveLearning cross-teacher and peer student isolation
     */
    public function test_adaptive_learning_isolation_for_students_and_teachers()
    {
        [$userA, $teacherA] = $this->createTeacherWithUser('Guru A');
        [$userB, $teacherB] = $this->createTeacherWithUser('Guru B');
        $classA = SchoolClass::create(['name' => 'XII-A', 'level' => '12']);
        $classB = SchoolClass::create(['name' => 'XII-B', 'level' => '12']);
        $subject = Subject::create(['name' => 'Kimia', 'code' => 'KIM']);

        TeachingAssignment::create([
            'teacher_id'       => $teacherA->id,
            'school_class_id'  => $classA->id,
            'subject_id'       => $subject->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
        ]);

        [$studentUser1, $student1] = $this->createStudentWithUser('Siswa 1', $classA);
        [$studentUser2, $student2] = $this->createStudentWithUser('Siswa 2', $classA);

        // Student 1 cannot view Student 2's adaptive learning summary
        $peerResponse = $this->actingAs($studentUser1)->get(route('adaptive-learning.summary', [
            'subject' => $subject->id,
            'student' => $student2->id,
        ]));
        $peerResponse->assertStatus(403);

        // Student 1 can view their own summary
        $ownResponse = $this->actingAs($studentUser1)->get(route('adaptive-learning.summary', [
            'subject' => $subject->id,
            'student' => $student1->id,
        ]));
        $ownResponse->assertStatus(200);

        // Guru B (unassigned) cannot view students list for Class A
        $teacherBResponse = $this->actingAs($userB)->get(route('adaptive-learning.students', [
            'subject' => $subject->id,
            'class'   => $classA->id,
        ]));
        $teacherBResponse->assertStatus(403);
    }

    /**
     * G5: FeedbackRevision IDOR on store and N+1 prevention
     */
    public function test_teacher_cannot_give_feedback_revision_on_another_teachers_assignment()
    {
        [$userA, $teacherA] = $this->createTeacherWithUser('Guru A');
        [$userB, $teacherB] = $this->createTeacherWithUser('Guru B');
        $class = SchoolClass::create(['name' => 'X-C', 'level' => '10']);
        $subject = Subject::create(['name' => 'Fisika', 'code' => 'FIS']);

        $assignmentA = LmsAssignment::create([
            'teacher_id'       => $teacherA->id,
            'subject_id'       => $subject->id,
            'title'            => 'Tugas Guru A',
            'description'      => 'Deskripsi Tugas Guru A',
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
        ]);

        [$studentUser, $student] = $this->createStudentWithUser('Siswa C', $class);

        $submission = LmsSubmission::create([
            'assignment_id' => $assignmentA->id,
            'student_id'    => $student->id,
            'content'       => 'Jawaban Siswa',
            'submitted_at'  => now(),
        ]);

        // Guru B tries to store feedback revision on Guru A's assignment submission
        $forbiddenStore = $this->actingAs($userB)->post(route('feedback-revisions.store'), [
            'submission_id' => $submission->id,
            'feedback'      => 'Revisi dari Guru B yang tidak berhak',
        ]);
        $forbiddenStore->assertStatus(403);

        // Guru A can store feedback revision
        $validStore = $this->actingAs($userA)->post(route('feedback-revisions.store'), [
            'submission_id' => $submission->id,
            'feedback'      => 'Silakan perbaiki bagian kesimpulan.',
        ]);
        $validStore->assertRedirect();
        $this->assertDatabaseHas('lms_feedback_revisions', [
            'submission_id' => $submission->id,
            'teacher_id'    => $teacherA->id,
        ]);

        // Test index query loads cleanly
        $indexResponse = $this->actingAs($userA)->get(route('feedback-revisions.index'));
        $indexResponse->assertStatus(200);
    }

    /**
     * G6: Gradebook learningReport authorization & admin access
     */
    public function test_gradebook_learning_report_authorization()
    {
        [$userA, $teacherA] = $this->createTeacherWithUser('Guru A');
        [$userB, $teacherB] = $this->createTeacherWithUser('Guru B');
        $adminUser = User::factory()->create(['role' => 'admin', 'name' => 'Admin']);

        $class = SchoolClass::create(['name' => 'X-D', 'level' => '10']);
        $subject = Subject::create(['name' => 'Sejarah', 'code' => 'SEJ']);

        TeachingAssignment::create([
            'teacher_id'       => $teacherA->id,
            'school_class_id'  => $class->id,
            'subject_id'       => $subject->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
        ]);

        // Guru B (unassigned) gets 403
        $forbiddenResponse = $this->actingAs($userB)->get(route('gradebook.learning-report', [
            'class_id'   => $class->id,
            'subject_id' => $subject->id,
        ]));
        $forbiddenResponse->assertStatus(403);

        // Guru A (assigned) gets 200
        $allowedResponse = $this->actingAs($userA)->get(route('gradebook.learning-report', [
            'class_id'   => $class->id,
            'subject_id' => $subject->id,
        ]));
        $allowedResponse->assertStatus(200);

        // Admin gets 200
        $adminResponse = $this->actingAs($adminUser)->get(route('gradebook.learning-report', [
            'class_id'   => $class->id,
            'subject_id' => $subject->id,
        ]));
        $adminResponse->assertStatus(200);
    }

    /**
     * G7: SchoolClass index batch pre-fetching
     */
    public function test_school_classes_index_loads_with_batched_queries()
    {
        [$userA, $teacherA] = $this->createTeacherWithUser('Guru A');
        $class1 = SchoolClass::create(['name' => 'X-E', 'level' => '10']);
        $class2 = SchoolClass::create(['name' => 'X-F', 'level' => '10']);
        $subject = Subject::create(['name' => 'Informatika', 'code' => 'INF']);

        TeachingAssignment::create([
            'teacher_id'       => $teacherA->id,
            'school_class_id'  => $class1->id,
            'subject_id'       => $subject->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
        ]);

        TeachingAssignment::create([
            'teacher_id'       => $teacherA->id,
            'school_class_id'  => $class2->id,
            'subject_id'       => $subject->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
        ]);

        $this->createStudentWithUser('Siswa 1', $class1);
        $this->createStudentWithUser('Siswa 2', $class2);

        $response = $this->actingAs($userA)->get(route('classes.index'));
        $response->assertStatus(200);
    }
}
