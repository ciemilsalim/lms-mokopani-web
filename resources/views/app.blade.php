<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="dark">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob: cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https: http: fonts.googleapis.com cdn.jsdelivr.net; font-src 'self' data: https: http: fonts.gstatic.com; img-src 'self' data: blob: https: http:; connect-src 'self' https: http: ws: wss:;">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>
        <link rel="icon" type="image/png" href="/logo.png?v=4">

        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
        <link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">

        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead

        <!-- KaTeX for formula support -->
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
        <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
