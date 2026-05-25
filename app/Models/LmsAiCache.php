<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LmsAiCache extends Model
{
    protected $table = 'lms_ai_caches';

    protected $fillable = [
        'prompt_hash',
        'prompt_type',
        'input_params',
        'generated_response'
    ];

    protected $casts = [
        'input_params' => 'array'
    ];

    /**
     * Retrieve a cached response by hash, or return null.
     */
    public static function getCache(string $hash): ?string
    {
        $cached = self::where('prompt_hash', $hash)->first();
        return $cached ? $cached->generated_response : null;
    }

    /**
     * Save/overwrite a cached response.
     */
    public static function setCache(string $hash, string $type, ?array $params, string $response): void
    {
        self::updateOrCreate(
            ['prompt_hash' => $hash],
            [
                'prompt_type' => $type,
                'input_params' => $params,
                'generated_response' => $response
            ]
        );
    }
}
