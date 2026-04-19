import { Navigate, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import type { AuthUser } from '@/store/authStore'

type Props = {
  readonly allowedRoles: AuthUser['role'][]
}

export function ProtectedRoute({ allowedRoles }: Props) {
  const { t } = useTranslation()
  const { isInitialized, accessToken, user } = useAuthStore()

  if (!isInitialized) {
    return <div data-testid="loading-spinner">{t('common.loading')}</div>
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}
