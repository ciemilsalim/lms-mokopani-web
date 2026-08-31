<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AcademicYear extends Model
{
    use HasFactory;

    protected $table = 'academic_years';

    protected $fillable = ['name', 'is_active'];

    public function semesters()
    {
        return $this->hasMany(Semester::class);
    }

    public static function getActive()
    {
        if (session()->has('active_academic_year_id')) {
            $ay = self::find(session('active_academic_year_id'));
            if ($ay) {
                return $ay;
            }
        }
        if (session()->has('active_semester_id')) {
            $sem = Semester::find(session('active_semester_id'));
            if ($sem && $sem->academicYear) {
                return $sem->academicYear;
            }
        }
        return self::where('is_active', true)->first();
    }
}
