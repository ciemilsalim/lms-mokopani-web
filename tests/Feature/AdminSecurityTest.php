<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\LmsAnnouncement;
use App\Models\LmsAssignment;
use App\Models\LmsSubmission;
use App\Models\SchoolClass;
use App\Models\Semester;
use App\Models\Setting;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TeachingAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdminSecurityTest extends TestCase
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
     * A1: Admin AI Analytics Settings - Teacher cannot access or update
     */
    public function test_teacher_cannot_access_or_update_admin_ai_analytics()
    {
        [$teacherUser] = $this->createTeacherWithUser('Guru Biasa');
        $adminUser = User::factory()->create(['role' => 'admin', 'name' => 'Admin']);

        // Teacher tries to view admin AI analytics
        $teacherView = $this->actingAs($teacherUser)->get(route('admin.ai-analytics.index'));
        $teacherView->assertStatus(403);

        // Teacher tries to update school-wide settings
        $teacherUpdate = $this->actingAs($teacherUser)->post(route('admin.ai-analytics.update-settings'), [
            'rapor_default_weights'  => [0.1, 0.1, 0.1, 0.7],
            'kktp_default_threshold' => 50,
        ]);
        $teacherUpdate->assertStatus(403);

        // Admin can view and update
        $adminView = $this->actingAs($adminUser)->get(route('admin.ai-analytics.index'));
        $adminView->assertStatus(200);

        $adminUpdate = $this->actingAs($adminUser)->post(route('admin.ai-analytics.update-settings'), [
            'rapor_default_weights'  => [0.2, 0.2, 0.2, 0.4],
            'kktp_default_threshold' => 75,
        ]);
        $adminUpdate->assertRedirect();
        $this->assertEquals('75', Setting::where('key', 'kktp_default_threshold')->value('value'));
    }

    /**
     * A2: Teacher cannot edit or delete Admin Announcement (teacher_id = null)
     */
    public function test_teacher_cannot_edit_or_delete_admin_announcement()
    {
        [$teacherUser, $teacher] = $this->createTeacherWithUser('Guru Penguji');
        $adminUser = User::factory()->create(['role' => 'admin', 'name' => 'Admin']);

        // Admin publishes school-wide announcement (teacher_id = null)
        $adminAnnouncement = LmsAnnouncement::create([
            'teacher_id'      => null,
            'school_class_id' => null,
            'title'           => 'Pengumuman Resmi Sekolah',
            'content'         => 'Libur semester dimulai pekan depan.',
            'priority'        => 'important',
        ]);

        // Teacher tries to edit Admin announcement
        $editResponse = $this->actingAs($teacherUser)->get(route('announcements.edit', $adminAnnouncement));
        $editResponse->assertStatus(403);

        // Teacher tries to update Admin announcement
        $updateResponse = $this->actingAs($teacherUser)->put(route('announcements.update', $adminAnnouncement), [
            'title'    => 'Pengumuman Dihack',
            'content'  => 'Teks dibajak',
            'priority' => 'info',
        ]);
        $updateResponse->assertStatus(403);

        // Teacher tries to delete Admin announcement
        $deleteResponse = $this->actingAs($teacherUser)->delete(route('announcements.destroy', $adminAnnouncement));
        $deleteResponse->assertStatus(403);

        // Admin can edit and update
        $adminEdit = $this->actingAs($adminUser)->get(route('announcements.edit', $adminAnnouncement));
        $adminEdit->assertStatus(200);

        $adminUpdate = $this->actingAs($adminUser)->put(route('announcements.update', $adminAnnouncement), [
            'title'    => 'Pengumuman Resmi Diperbarui',
            'content'  => 'Revisi jadwal libur.',
            'priority' => 'important',
        ]);
        $adminUpdate->assertRedirect();
        $this->assertDatabaseHas('lms_announcements', [
            'id'    => $adminAnnouncement->id,
            'title' => 'Pengumuman Resmi Diperbarui',
        ]);
    }

    /**
     * A3: Analytics show IDOR protection - Teacher only accesses assigned class/subject
     */
    public function test_teacher_cannot_view_unassigned_class_analytics()
    {
        [$teacherUserA, $teacherA] = $this->createTeacherWithUser('Guru A');
        [$teacherUserB, $teacherB] = $this->createTeacherWithUser('Guru B');
        $adminUser = User::factory()->create(['role' => 'admin', 'name' => 'Admin']);

        $classA = SchoolClass::create(['name' => 'X-1', 'level' => '10']);
        $subject = Subject::create(['name' => 'Geografi', 'code' => 'GEO']);

        TeachingAssignment::create([
            'teacher_id'       => $teacherA->id,
            'school_class_id'  => $classA->id,
            'subject_id'       => $subject->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
        ]);

        // Guru B (unassigned) tries to view analytics of Class A
        $forbiddenResponse = $this->actingAs($teacherUserB)->get(route('analytics.show', [
            'subjectId' => $subject->id,
            'classId'   => $classA->id,
        ]));
        $forbiddenResponse->assertStatus(403);

        // Guru A (assigned) gets 200
        $allowedResponse = $this->actingAs($teacherUserA)->get(route('analytics.show', [
            'subjectId' => $subject->id,
            'classId'   => $classA->id,
        ]));
        $allowedResponse->assertStatus(200);

        // Admin gets 200
        $adminResponse = $this->actingAs($adminUser)->get(route('analytics.show', [
            'subjectId' => $subject->id,
            'classId'   => $classA->id,
        ]));
        $adminResponse->assertStatus(200);
    }

    /**
     * A4: Admin without teacher record can view AI prompts without HTTP 500
     */
    public function test_admin_without_teacher_profile_can_view_prompts()
    {
        $adminUser = User::factory()->create(['role' => 'admin', 'name' => 'Admin Murni']);
        $this->assertNull($adminUser->teacher);

        $response = $this->actingAs($adminUser)->get(route('lesson-plans.prompts.get'));
        $response->assertStatus(200);
        $response->assertJsonStructure([
            '*' => ['key', 'name', 'default_prompt', 'prompt_text'],
        ]);
    }

    /**
     * A5: Admin dashboard renders course progress with optimized batching
     */
    public function test_admin_dashboard_renders_without_errors()
    {
        $adminUser = User::factory()->create(['role' => 'admin', 'name' => 'Admin Dashboard']);
        $class = SchoolClass::create(['name' => 'X-2', 'level' => '10']);
        $subject = Subject::create(['name' => 'Ekonomi', 'code' => 'EKO']);

        $assignment = LmsAssignment::create([
            'teacher_id'       => 1,
            'subject_id'       => $subject->id,
            'title'            => 'Tugas Ekonomi',
            'description'      => 'Deskripsi Tugas Ekonomi',
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
        ]);

        [$studentUser, $student] = $this->createStudentWithUser('Siswa Dashboard', $class);

        LmsSubmission::create([
            'assignment_id' => $assignment->id,
            'student_id'    => $student->id,
            'score'         => 85,
            'submitted_at'  => now(),
        ]);

        $response = $this->actingAs($adminUser)->get(route('dashboard'));
        $response->assertStatus(200);
    }
}
