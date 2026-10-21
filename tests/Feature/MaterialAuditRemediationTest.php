<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\LmsComment;
use App\Models\LmsMaterial;
use App\Models\LmsReflection;
use App\Models\LmsStudentMaterial;
use App\Models\SchoolClass;
use App\Models\Semester;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MaterialAuditRemediationTest extends TestCase
{
    use RefreshDatabase;

    protected AcademicYear $academicYear;
    protected Semester $semester;
    protected SchoolClass $classA;
    protected SchoolClass $classB;
    protected Subject $subject;
    protected User $teacherAUser;
    protected Teacher $teacherA;
    protected User $teacherBUser;
    protected Teacher $teacherB;
    protected User $studentAUser;
    protected Student $studentA;
    protected User $studentBUser;
    protected Student $studentB;

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

        $this->classA = SchoolClass::create(['name' => 'Kelas 7-A']);
        $this->classB = SchoolClass::create(['name' => 'Kelas 7-B']);
        $this->subject = Subject::create(['name' => 'Informatika', 'code' => 'INF-7']);

        // Teacher A
        $this->teacherAUser = User::factory()->create(['role' => 'teacher', 'name' => 'Guru Informatika A']);
        $this->teacherA = Teacher::create([
            'user_id' => $this->teacherAUser->id,
            'name'    => 'Guru Informatika A',
        ]);

        // Teacher B
        $this->teacherBUser = User::factory()->create(['role' => 'teacher', 'name' => 'Guru Lain B']);
        $this->teacherB = Teacher::create([
            'user_id' => $this->teacherBUser->id,
            'name'    => 'Guru Lain B',
        ]);

        // Student A (Class A)
        $this->studentAUser = User::factory()->create(['role' => 'student', 'name' => 'Siswa Kelas A']);
        $this->studentA = Student::create([
            'user_id'         => $this->studentAUser->id,
            'name'            => 'Siswa Kelas A',
            'nis'             => '7001',
            'unique_id'       => 'STU-7001',
            'school_class_id' => $this->classA->id,
        ]);

        // Student B (Class B)
        $this->studentBUser = User::factory()->create(['role' => 'student', 'name' => 'Siswa Kelas B']);
        $this->studentB = Student::create([
            'user_id'         => $this->studentBUser->id,
            'name'            => 'Siswa Kelas B',
            'nis'             => '7002',
            'unique_id'       => 'STU-7002',
            'school_class_id' => $this->classB->id,
        ]);
    }

    /**
     * M3: Test complete authorization and IDOR prevention.
     */
    public function test_complete_authorization_enforces_class_boundary_and_lock_status()
    {
        $material = LmsMaterial::create([
            'teacher_id'       => $this->teacherA->id,
            'subject_id'       => $this->subject->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'title'            => 'Algoritma Pemrograman',
            'access_status'    => 'auto',
        ]);
        $material->schoolClasses()->attach($this->classA->id);

        // Student B (Class B) tries to complete Class A material -> 403 Forbidden
        $responseB = $this->actingAs($this->studentBUser)->post("/materials/{$material->id}/complete");
        $responseB->assertStatus(403);
        $this->assertDatabaseMissing('lms_student_materials', [
            'student_id'  => $this->studentB->id,
            'material_id' => $material->id,
        ]);

        // Student A (Class A) completes Class A material -> Success
        $responseA = $this->actingAs($this->studentAUser)->post("/materials/{$material->id}/complete");
        $responseA->assertRedirect();
        $this->assertDatabaseHas('lms_student_materials', [
            'student_id'  => $this->studentA->id,
            'material_id' => $material->id,
        ]);

        // When material is locked, Student A cannot complete -> 403 Forbidden
        $material->update(['access_status' => 'locked']);
        $responseLocked = $this->actingAs($this->studentAUser)->post("/materials/{$material->id}/complete");
        $responseLocked->assertStatus(403);
    }

    /**
     * M1 & M3: Test reflection submission authorization and auto-completion.
     */
    public function test_student_reflection_submission_and_class_authorization()
    {
        $material = LmsMaterial::create([
            'teacher_id'       => $this->teacherA->id,
            'subject_id'       => $this->subject->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'title'            => 'Berpikir Komputasional',
            'access_status'    => 'open',
        ]);
        $material->schoolClasses()->attach($this->classA->id);

        // Student B cannot submit reflection for Class A material -> 403
        $responseB = $this->actingAs($this->studentBUser)->post('/reflections', [
            'material_id'         => $material->id,
            'understanding_level' => 5,
            'interesting_thing'   => 'Mencoba bypass refleksi',
            'difficulty'          => 'Tidak ada',
        ]);
        $responseB->assertStatus(403);

        // Student A submits reflection -> 200/Redirect & marks completed
        $responseA = $this->actingAs($this->studentAUser)->post('/reflections', [
            'material_id'         => $material->id,
            'understanding_level' => 4,
            'interesting_thing'   => 'Konsep abstraksi data sangat menarik',
            'difficulty'          => 'Sedikit bingung saat dekomposisi kasus',
        ]);
        $responseA->assertRedirect();

        $this->assertDatabaseHas('lms_reflections', [
            'student_id'          => $this->studentA->id,
            'material_id'         => $material->id,
            'understanding_level' => 4,
        ]);

        $this->assertDatabaseHas('lms_student_materials', [
            'student_id'  => $this->studentA->id,
            'material_id' => $material->id,
        ]);
    }

    /**
     * M4: Test student gets is_completed flag on materials index.
     */
    public function test_student_index_contains_is_completed_flag()
    {
        $material1 = LmsMaterial::create([
            'teacher_id'       => $this->teacherA->id,
            'subject_id'       => $this->subject->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'title'            => 'Materi 1 - Sudah Selesai',
            'access_status'    => 'open',
            'created_at'       => now()->subDay(),
        ]);
        $material1->schoolClasses()->attach($this->classA->id);

        $material2 = LmsMaterial::create([
            'teacher_id'       => $this->teacherA->id,
            'subject_id'       => $this->subject->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'title'            => 'Materi 2 - Belum Selesai',
            'access_status'    => 'open',
            'created_at'       => now(),
        ]);
        $material2->schoolClasses()->attach($this->classA->id);

        // Student A completed material1
        LmsStudentMaterial::create([
            'student_id'   => $this->studentA->id,
            'material_id'  => $material1->id,
            'completed_at' => now(),
        ]);

        $response = $this->actingAs($this->studentAUser)->get('/materials');
        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('materials/index')
            ->has('grouped_materials.0.tps.0.materials', 2)
            ->where('grouped_materials.0.tps.0.materials', function ($materials) use ($material1, $material2) {
                $completed = collect($materials)->firstWhere('id', $material1->id);
                $uncompleted = collect($materials)->firstWhere('id', $material2->id);

                return $completed && $completed['is_completed'] === true
                    && $uncompleted && $uncompleted['is_completed'] === false;
            })
        );
    }

    /**
     * M2 & M6: Test teacher show page receives class_stats and all_reflections.
     */
    public function test_teacher_show_page_receives_class_stats_and_reflections()
    {
        $material = LmsMaterial::create([
            'teacher_id'       => $this->teacherA->id,
            'subject_id'       => $this->subject->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'title'            => 'Struktur Data Dasar',
            'access_status'    => 'open',
        ]);
        $material->schoolClasses()->attach($this->classA->id);

        // Student A completes and reflects
        LmsReflection::create([
            'student_id'          => $this->studentA->id,
            'material_id'         => $material->id,
            'understanding_level' => 5,
            'interesting_thing'   => 'Pointer dan Array',
            'difficulty'          => 'Tidak ada',
        ]);
        LmsStudentMaterial::create([
            'student_id'   => $this->studentA->id,
            'material_id'  => $material->id,
            'completed_at' => now(),
        ]);

        $response = $this->actingAs($this->teacherAUser)->get("/materials/{$material->id}");
        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('materials/show')
            ->where('class_stats.total_students', 1)
            ->where('class_stats.completed_students', 1)
            ->where('class_stats.percentage', 100)
            ->where('all_reflections.0.student_name', 'Siswa Kelas A')
            ->where('all_reflections.0.understanding_level', 5)
        );
    }

    /**
     * M8: Test comment deletion authorization.
     */
    public function test_comment_deletion_authorization_enforced()
    {
        $material = LmsMaterial::create([
            'teacher_id'       => $this->teacherA->id,
            'subject_id'       => $this->subject->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'title'            => 'Materi Diskusi',
            'access_status'    => 'open',
        ]);
        $material->schoolClasses()->attach($this->classA->id);

        $comment = LmsComment::create([
            'user_id'     => $this->studentAUser->id,
            'material_id' => $material->id,
            'body'        => 'Pertanyaan dari siswa A',
        ]);

        // Teacher B (who does not teach this material) cannot delete comment -> 403
        $responseTeacherB = $this->actingAs($this->teacherBUser)->delete("/comments/{$comment->id}");
        $responseTeacherB->assertStatus(403);
        $this->assertDatabaseHas('lms_comments', ['id' => $comment->id]);

        // Teacher A (owner of material) can delete comment -> 200/Redirect
        $responseTeacherA = $this->actingAs($this->teacherAUser)->delete("/comments/{$comment->id}");
        $responseTeacherA->assertRedirect();
        $this->assertDatabaseMissing('lms_comments', ['id' => $comment->id]);
    }
}
