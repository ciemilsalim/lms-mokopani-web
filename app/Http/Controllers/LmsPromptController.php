<?php

namespace App\Http\Controllers;

use App\Models\LmsAiPrompt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LmsPromptController extends Controller
{
    /**
     * Get all prompts (fallback + custom) for the logged-in teacher.
     */
    public function index(Request $request)
    {
        $teacher = Auth::user()->teacher;

        // The master list of all prompt keys we support.
        $keys = [
            'modul_ajar' => [
                'name' => 'Pembuatan RPP / Modul Ajar Utuh',
                'description' => 'Prompt utama untuk menyusun Modul Ajar (RPP) yang meliputi 7 bagian komponen.',
                'placeholders' => ['{subject}', '{class}', '{tp}', '{material}', '{pedagogical_model}', '{initial_assessments}', '{formative_assessments}', '{summative_assessments}']
            ],
            'experiences' => [
                'name' => 'Langkah Pengalaman Belajar',
                'description' => 'Prompt untuk menyusun skenario 3 langkah kegiatan inti (Memahami, Mengaplikasi, Merefleksi).',
                'placeholders' => ['{subject}', '{tp}', '{content}', '{pedagogical_model}']
            ],
            'assessment' => [
                'name' => 'Instrumen Asesmen (Kuis & Survei)',
                'description' => 'Prompt untuk merancang soal/kuis berdasarkan jenis asesmen yang dipilih.',
                'placeholders' => ['{tp}', '{content}', '{instrument_label}']
            ],
            'lkpd' => [
                'name' => 'Lembar Kerja Peserta Didik (LKPD)',
                'description' => 'Prompt untuk menyusun kerangka LKPD.',
                'placeholders' => ['{subject}', '{tp}', '{pedagogical_model}']
            ],
            'tp_direct' => [
                'name' => 'Generasi TP Langsung (Capaian Pembelajaran)',
                'description' => 'Prompt untuk memecah Capaian Pembelajaran langsung menjadi beberapa TP turunan.',
                'placeholders' => ['{cp_desc}']
            ],
            'tp_analysis' => [
                'name' => 'Analisis Kompetensi Capaian Pembelajaran',
                'description' => 'Prompt untuk mengekstrak kompetensi, level taksonomi, dan lingkup materi dari CP.',
                'placeholders' => ['{cp_desc}']
            ],
            'tp_cross_element' => [
                'name' => 'Tujuan Pembelajaran Lintas Elemen',
                'description' => 'Prompt untuk memadukan berbagai Capaian Pembelajaran lintas elemen menjadi satu TP.',
                'placeholders' => ['{cps_desc}']
            ],
            'orchestrator_draft' => [
                'name' => 'Draf Materi Mentah (Orchestrator)',
                'description' => 'Prompt untuk membuat materi utama berdasarkan subjek dan materi tertentu.',
                'placeholders' => ['{subject}', '{class}', '{pedagogical_model}', '{tp}']
            ],
        ];

        $results = [];

        foreach ($keys as $key => $meta) {
            // Check if teacher has custom prompt
            $custom = LmsAiPrompt::where('key', $key)
                ->where('teacher_id', $teacher->id)
                ->first();

            $isCustom = $custom && !empty($custom->prompt_text);
            $promptText = LmsAiPrompt::getPromptFor($key, $teacher->id); // Automatically gets fallback if no custom
            $defaultPrompt = LmsAiPrompt::getPromptFor($key, null); // Get system fallback

            $results[] = [
                'key' => $key,
                'name' => $meta['name'],
                'description' => $meta['description'],
                'placeholders' => $meta['placeholders'],
                'default_prompt' => $defaultPrompt,
                'custom_prompt' => $custom ? $custom->prompt_text : null,
                'prompt_text' => $promptText,
                'is_custom' => $isCustom,
            ];
        }

        return response()->json($results);
    }

    /**
     * Save custom prompt for the teacher.
     */
    public function store(Request $request)
    {
        $teacher = Auth::user()->teacher;

        $validated = $request->validate([
            'key' => 'required|string',
            'prompt_text' => 'required|string'
        ]);

        $prompt = LmsAiPrompt::updateOrCreate(
            ['key' => $validated['key'], 'teacher_id' => $teacher->id],
            ['prompt_text' => $validated['prompt_text']]
        );

        return response()->json(['success' => true, 'data' => $prompt]);
    }

    /**
     * Reset prompt to system default (delete custom prompt for the teacher).
     */
    public function reset(Request $request)
    {
        $teacher = Auth::user()->teacher;

        $validated = $request->validate([
            'key' => 'required|string'
        ]);

        LmsAiPrompt::where('key', $validated['key'])
            ->where('teacher_id', $teacher->id)
            ->delete();

        return response()->json(['success' => true]);
    }
}
