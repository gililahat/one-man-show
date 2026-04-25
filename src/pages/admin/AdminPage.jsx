// src/pages/admin/AdminPage.jsx
import useAuthStore from '@/store/authStore'

export default function AdminPage() {
  const profile = useAuthStore(s => s.profile)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">ממשק ניהול</h1>
      <p className="text-ink-muted">ברוך הבא, {profile?.profile?.name}. יש לך הרשאות מנהל.</p>
    </div>
  )
}
