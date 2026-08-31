<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Semester extends Model
{
    use HasFactory;

    protected $table = 'semesters';

    protected $fillable = ['academic_year_id', 'name', 'is_active'];

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public static function getActive()
    {
        if (session()->has('active_semester_id')) {
            $sem = self::find(session('active_semester_id'));
            if ($sem) {
                return $sem;
            }
        }
        return self::where('is_active', true)->first();
    }
}
