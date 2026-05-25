<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $notifications = Notification::where('user_id', $user->id)
            ->latest()
            ->take(50)
            ->get()
            ->map(fn ($n) => [
                'id'         => $n->id,
                'type'       => $n->type,
                'title'      => $n->title,
                'message'    => $n->message,
                'data'       => $n->data,
                'read_at'    => $n->read_at,
                'is_read'    => $n->read_at !== null,
                'created_at' => $n->created_at->diffForHumans(),
            ]);

        $unreadCount = Notification::where('user_id', $user->id)->unread()->count();

        // Inertia visit (sidebar link) → render full page
        if ($request->header('X-Inertia')) {
            return Inertia::render('notifications/index', [
                'notifications' => $notifications,
                'unread_count'  => $unreadCount,
            ]);
        }

        // Regular fetch (notification bell dropdown) → return JSON
        return response()->json([
            'notifications' => $notifications,
            'unread_count'  => $unreadCount,
        ]);
    }

    public function read(Notification $notification)
    {
        if ($notification->user_id !== Auth::id()) {
            abort(403);
        }

        $notification->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }

    public function readAll()
    {
        Notification::where('user_id', Auth::id())->unread()->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }
}
