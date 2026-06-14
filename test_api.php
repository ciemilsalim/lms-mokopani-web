<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = \App\Models\User::where('role', 'teacher')->first();
Auth::login($user);
$req = Illuminate\Http\Request::create('/lesson-plans/prompts/all', 'GET');
$res = app()->handle($req);

echo "Status: " . $res->getStatusCode() . "\n";
if ($res->getStatusCode() >= 400) {
    echo "Content: " . $res->getContent() . "\n";
} else {
    echo "Success! Content length: " . strlen($res->getContent()) . "\n";
}
