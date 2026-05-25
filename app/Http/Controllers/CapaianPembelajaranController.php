<?php

namespace App\Http\Controllers;

use App\Models\LmsCapaianPembelajaran;
use App\Models\Subject;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CapaianPembelajaranController extends Controller
{
    public function index(Request $request)
    {
        $cpQuery = LmsCapaianPembelajaran::with('subject');

        if ($request->filled('subject_id')) {
            $cpQuery->where('subject_id', $request->subject_id);
        }

        if ($request->filled('fase')) {
            $cpQuery->where('fase', $request->fase);
        }

        $cpList = $cpQuery->orderBy('fase')->orderBy('elemen')->get();

        $subjects = Subject::orderBy('name')->get(['id', 'name', 'fase']);

        return Inertia::render('cp/index', [
            'cpList'  => $cpList,
            'subjects' => $subjects,
            'filters'  => $request->only(['subject_id', 'fase']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'kode'       => 'nullable|string|max:50|unique:lms_capaian_pembelajaran,kode',
            'fase'       => 'required|in:Fondasi,A,B,C,D,E,F',
            'elemen'     => 'required|string|max:255',
            'subject_id' => 'required|exists:mysql_absensi.subjects,id',
            'deskripsi'  => 'required|string',
        ]);

        LmsCapaianPembelajaran::create($validated);

        return back()->with('success', 'Capaian Pembelajaran berhasil ditambahkan.');
    }

    public function update(Request $request, LmsCapaianPembelajaran $capaianPembelajaran)
    {
        $validated = $request->validate([
            'kode'       => 'nullable|string|max:50|unique:lms_capaian_pembelajaran,kode,' . $capaianPembelajaran->id,
            'fase'       => 'required|in:Fondasi,A,B,C,D,E,F',
            'elemen'     => 'required|string|max:255',
            'subject_id' => 'required|exists:mysql_absensi.subjects,id',
            'deskripsi'  => 'required|string',
        ]);

        $capaianPembelajaran->update($validated);

        return back()->with('success', 'Capaian Pembelajaran berhasil diperbarui.');
    }

    public function destroy(LmsCapaianPembelajaran $capaianPembelajaran)
    {
        $capaianPembelajaran->delete();

        return back()->with('success', 'Capaian Pembelajaran berhasil dihapus.');
    }
}
