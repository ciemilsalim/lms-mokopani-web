<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\LmsAnnouncement;
use App\Models\LmsAssignment;
use App\Models\LmsSubmission;
use App\Models\ParentModel;
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

class ParentPortalTest extends TestCase
{
    use RefreshDatabase;

    protected AcademicYear $academicYear;
    protected Semester $semester;

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
    }

    protected function createParentWithChildren(int $childrenCount = 1): array
    {
        $user = User::factory()->create(['role' => 'parent', 'name' => 'Wali Murid Test']);
        $parent = ParentModel::create([
            'user_id' => $user->id,
            'name'    => 'Wali Murid Test',
        ]);

        $students = [];
        for ($i = 0; $i < $childrenCount; $i++) {
            $class = SchoolClass::create(['name' => 'Kelas ' . uniqid()]);
            $student = Student::create([
                'name'            => 'Anak ' . ($i + 1),
                'nis'             => 'NIS-' . rand(1000, 9999),
                'unique_id'       => 'STU-' . rand(10000, 99999),
                'school_class_id' => $class->id,
            ]);
            $parent->students()->attach($student->id);
            $students[] = $student;
        }

        return [$user, $parent, $students];
    }

    public function test_parent_dashboard_loads_with_correct_metrics_excluding_teacher_only_instruments()
    {
        // T4 & T6: Parent dashboard excluding teacher-only instruments
        [$parentUser, $parent, $students] = $this->createParentWithChildren(2);
        $child1 = $students[0];
        $child2 = $students[1];

        $teacherUser = User::factory()->create(['role' => 'teacher']);
        $teacher = Teacher::create(['user_id' => $teacherUser->id, 'name' => 'Guru IPA']);
        $subject = Subject::create(['name' => 'IPA', 'code' => 'IPA-01']);

        // 1 online assignment for Child 1's class
        $onlineAssignment = LmsAssignment::create([
            'teacher_id'       => $teacher->id,
            'subject_id'       => $subject->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'title'            => 'Tugas Daring IPA',
            'description'      => 'Deskripsi Tugas',
            'instrument_type'  => 'written_test',
            'assessment_type'  => 'formative',
            'due_date'         => now()->addDays(2),
        ]);
        $onlineAssignment->schoolClasses()->attach($child1->school_class_id);

        // 1 teacher-only observation sheet for Child 1's class
        $teacherOnlyAssignment = LmsAssignment::create([
            'teacher_id'       => $teacher->id,
            'subject_id'       => $subject->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'title'            => 'Observasi Praktikum',
            'description'      => 'Observasi Guru',
            'instrument_type'  => 'observation_checklist',
            'assessment_type'  => 'formative',
            'due_date'         => now()->addDays(2),
        ]);
        $teacherOnlyAssignment->schoolClasses()->attach($child1->school_class_id);

        // Child 1 submits the online assignment
        LmsSubmission::create([
            'assignment_id' => $onlineAssignment->id,
            'student_id'    => $child1->id,
            'score'         => 90,
            'submitted_at'  => now(),
        ]);

        $response = $this->actingAs($parentUser)->get('/parent/dashboard');
        $response->assertStatus(200);

        // Total assignments should be 1 (excluding observation_sheet), submitted 1, pending 0!
        $response->assertInertia(fn (Assert $page) => $page
            ->component('parent/dashboard')
            ->has('children', 2)
            ->where('children.0.total_assignments', 1)
            ->where('children.0.submitted', 1)
            ->where('children.0.pending', 0)
            ->where('children.0.avg_score', 90)
        );
    }

    public function test_parent_child_detail_loads_with_null_attendance_on_zero_meetings()
    {
        // T5: Attendance null when zero meetings
        [$parentUser, $parent, $students] = $this->createParentWithChildren(1);
        $child = $students[0];

        $teacherUser = User::factory()->create(['role' => 'teacher']);
        $teacher = Teacher::create(['user_id' => $teacherUser->id, 'name' => 'Guru MTK']);
        $subject = Subject::create(['name' => 'Matematika', 'code' => 'MTK-01']);

        $assignment = LmsAssignment::create([
            'teacher_id'       => $teacher->id,
            'subject_id'       => $subject->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'title'            => 'PR Aljabar',
            'description'      => 'Kerjakan soal 1-5',
            'instrument_type'  => 'written_test',
            'assessment_type'  => 'formative',
            'due_date'         => now()->addDays(3),
        ]);
        $assignment->schoolClasses()->attach($child->school_class_id);

        $response = $this->actingAs($parentUser)->get("/parent/child/{$child->id}");
        $response->assertStatus(200);

        // Attendance percentage must be null (not 100!) because 0 meetings held
        $response->assertInertia(fn (Assert $page) => $page
            ->component('parent/child')
            ->where('student.id', $child->id)
            ->has('report', 1)
            ->where('report.0.subject_name', 'Matematika')
            ->where('report.0.total_meetings', 0)
            ->where('report.0.attendance_percentage', null)
        );
    }

    public function test_parent_cannot_view_unrelated_child_data()
    {
        // IDOR protection test
        [$parentUser1, $parent1, $students1] = $this->createParentWithChildren(1);
        [$parentUser2, $parent2, $students2] = $this->createParentWithChildren(1);

        $unrelatedChild = $students2[0];

        // Parent 1 attempts to access child of Parent 2 -> 403 Forbidden
        $response = $this->actingAs($parentUser1)->get("/parent/child/{$unrelatedChild->id}");
        $response->assertStatus(403);
    }

    public function test_parent_announcements_are_scoped_to_children_classes_and_global()
    {
        // T1: Scoped announcements for parents
        [$parentUser, $parent, $students] = $this->createParentWithChildren(1);
        $myChildClass = $students[0]->schoolClass;
        $otherClass = SchoolClass::create(['name' => 'Kelas Lain ' . uniqid()]);

        $teacherUser = User::factory()->create(['role' => 'teacher']);
        $teacher = Teacher::create(['user_id' => $teacherUser->id, 'name' => 'Guru Pengumuman']);

        // 1. Global school-wide announcement (older)
        $globalAnn = LmsAnnouncement::create([
            'teacher_id'      => $teacher->id,
            'school_class_id' => null,
            'title'           => 'Pengumuman Libur Nasional',
            'content'         => 'Sekolah libur besok.',
            'priority'        => 'important',
        ]);
        $globalAnn->forceFill(['created_at' => now()->subMinutes(10)])->save();

        // 2. Child's class announcement (newer)
        $childClassAnn = LmsAnnouncement::create([
            'teacher_id'      => $teacher->id,
            'school_class_id' => $myChildClass->id,
            'title'           => 'Rapat Kelas Anak Saya',
            'content'         => 'Rapat wali murid kelas A.',
            'priority'        => 'info',
        ]);
        $childClassAnn->forceFill(['created_at' => now()])->save();

        // 3. Other class announcement (should NOT be visible to parent)
        $otherClassAnn = LmsAnnouncement::create([
            'teacher_id'      => $teacher->id,
            'school_class_id' => $otherClass->id,
            'title'           => 'Catatan Khusus Kelas 99',
            'content'         => 'Hanya untuk kelas 99.',
            'priority'        => 'warning',
            'created_at'      => now(),
        ]);

        $response = $this->actingAs($parentUser)->get('/announcements');
        $response->assertStatus(200);

        $response->assertInertia(fn (Assert $page) => $page
            ->component('announcements/index')
            ->has('announcements', 2)
            ->where('announcements.0.title', 'Rapat Kelas Anak Saya')
            ->where('announcements.1.title', 'Pengumuman Libur Nasional')
            ->where('user_role', 'parent')
            ->where('classes', [])
        );
    }

    public function test_parent_accessing_gradebook_is_safely_redirected_to_parent_dashboard()
    {
        // T2: Safe redirect on /gradebook
        [$parentUser, $parent, $students] = $this->createParentWithChildren(1);

        $response = $this->actingAs($parentUser)->get('/gradebook');
        $response->assertRedirect(route('parent.dashboard'));
    }

    public function test_role_resolution_fallback_identifies_parent_when_role_column_is_default_user()
    {
        // T3: Fallback role resolution when user role is default 'user'
        $user = User::factory()->create(['role' => 'user', 'name' => 'Wali Murid Tanpa Role Kolom']);
        $parent = ParentModel::create([
            'user_id' => $user->id,
            'name'    => 'Wali Murid Tanpa Role Kolom',
        ]);
        $class = SchoolClass::create(['name' => 'Kelas 10-Z']);
        $student = Student::create([
            'name'            => 'Anak Z',
            'nis'             => 'NIS-9999',
            'unique_id'       => 'STU-9999',
            'school_class_id' => $class->id,
        ]);
        $parent->students()->attach($student->id);

        $response = $this->actingAs($user)->get('/parent/dashboard');
        // Must succeed with 200, not 403 Forbidden!
        $response->assertStatus(200);
    }

    public function test_parent_with_zero_children_renders_empty_state_without_crashing()
    {
        // Edge case: Parent with no linked children
        $user = User::factory()->create(['role' => 'parent']);
        ParentModel::create([
            'user_id' => $user->id,
            'name'    => 'Wali Murid Baru',
        ]);

        $response = $this->actingAs($user)->get('/parent/dashboard');
        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('parent/dashboard')
            ->has('children', 0)
        );
    }

    public function test_parent_with_child_having_null_class_renders_without_crashing()
    {
        // Edge case: Child without school_class_id
        $user = User::factory()->create(['role' => 'parent']);
        $parent = ParentModel::create([
            'user_id' => $user->id,
            'name'    => 'Wali Murid',
        ]);
        $student = Student::create([
            'name'            => 'Anak Tanpa Kelas',
            'nis'             => 'NIS-NULL',
            'unique_id'       => 'STU-NULL',
            'school_class_id' => null,
        ]);
        $parent->students()->attach($student->id);

        $response = $this->actingAs($user)->get('/parent/dashboard');
        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('parent/dashboard')
            ->has('children', 1)
            ->where('children.0.class_name', '-')
            ->where('children.0.total_assignments', 0)
        );

        $detailResponse = $this->actingAs($user)->get("/parent/child/{$student->id}");
        $detailResponse->assertStatus(200);
        $detailResponse->assertInertia(fn (Assert $page) => $page
            ->component('parent/child')
            ->where('student.class_name', '-')
            ->has('report', 0)
        );
    }

    public function test_parent_with_zero_children_sees_only_school_wide_announcements()
    {
        // Edge case: Announcements for parent with no linked children
        $user = User::factory()->create(['role' => 'parent']);
        ParentModel::create([
            'user_id' => $user->id,
            'name'    => 'Wali Murid Tanpa Anak',
        ]);

        $teacherUser = User::factory()->create(['role' => 'teacher']);
        $teacher = Teacher::create(['user_id' => $teacherUser->id, 'name' => 'Guru']);
        $class = SchoolClass::create(['name' => 'Kelas X']);

        LmsAnnouncement::create([
            'teacher_id'      => $teacher->id,
            'school_class_id' => null,
            'title'           => 'Pengumuman Umum Sekolah',
            'content'         => 'Libur semester.',
        ]);

        LmsAnnouncement::create([
            'teacher_id'      => $teacher->id,
            'school_class_id' => $class->id,
            'title'           => 'Pengumuman Kelas X',
            'content'         => 'Khusus kelas X.',
        ]);

        $response = $this->actingAs($user)->get('/announcements');
        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('announcements/index')
            ->has('announcements', 1)
            ->where('announcements.0.title', 'Pengumuman Umum Sekolah')
        );
    }
}
