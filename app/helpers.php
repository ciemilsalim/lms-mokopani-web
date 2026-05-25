<?php

use App\Models\Setting;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

if (!function_exists('school_setting')) {
    function school_setting(?string $key = null, mixed $default = null): mixed
    {
        static $settings = null;

        if ($settings === null) {
            $settings = Cache::remember('school_settings', 3600, function () {
                return Setting::pluck('value', 'key');
            });
        }

        if ($key === null) {
            return $settings;
        }

        return $settings->get($key, $default);
    }
}

if (!function_exists('school_logo_url')) {
    function school_logo_url(): ?string
    {
        $path = school_setting('app_logo');
        if (!$path) return null;

        $paths = [
            storage_path('app/public/' . $path),
            base_path('../aplikasi-absensi/storage/app/public/' . $path),
            public_path('storage/' . $path),
        ];

        foreach ($paths as $fullPath) {
            $fullPath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $fullPath);
            if (file_exists($fullPath)) {
                $type = pathinfo($fullPath, PATHINFO_EXTENSION);
                $data = file_get_contents($fullPath);
                return 'data:image/' . $type . ';base64,' . base64_encode($data);
            }
        }

        return null;
    }
}

if (!function_exists('get_kktp')) {
    function get_kktp($subjectId = null): int
    {
        if ($subjectId) {
            $subject = \App\Models\Subject::find($subjectId);
            if ($subject && $subject->kktp) {
                return (int) $subject->kktp;
            }
        }
        return (int) school_setting('kktp', 70);
    }
}

if (!function_exists('clear_school_settings_cache')) {
    function clear_school_settings_cache(): void
    {
        Cache::forget('school_settings');
    }
}
