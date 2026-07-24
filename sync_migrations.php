<?php

$sourceDir = __DIR__ . '/../sistem-pangkalan-data/database/migrations';
$destDir = __DIR__ . '/database/migrations';

if (!is_dir($sourceDir)) {
    echo "Source migrations directory not found at {$sourceDir}\n";
    exit(1);
}

if (!is_dir($destDir)) {
    mkdir($destDir, 0755, true);
}

$files = glob($sourceDir . '/*.*');
$count = 0;
foreach ($files as $file) {
    if (is_file($file)) {
        copy($file, $destDir . '/' . basename($file));
        $count++;
    }
}

echo "Successfully synced {$count} migration files from SIPADA to LMS Mokopani!\n";
