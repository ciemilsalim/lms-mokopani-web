<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Semester;

class AcademicPeriodController extends Controller
{
    /**
     * Switch the active global semester for LMS.
     */
    public function switch(Request $request)
    {
        $request->validate([
            'semester_id' => 'required|exists:semesters,id',
        ]);

        $semester = Semester::findOrFail($request->semester_id);

        session(['active_semester_id' => $semester->id]);
        session(['active_academic_year_id' => $semester->academic_year_id]);

        return back()->with('message', 'Tahun Ajaran/Semester berhasil diubah.');
    }
}
