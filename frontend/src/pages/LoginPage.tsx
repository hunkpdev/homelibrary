import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { decodeAuthUser, useAuthStore } from '@/store/authStore'
import axiosInstance from '@/api/axiosInstance'

interface LoginResponse {
  accessToken: string
}

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const accessToken = useAuthStore(state => state.accessToken)
  const setAuth = useAuthStore(state => state.setAuth)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (accessToken) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const res = await axiosInstance.post<LoginResponse>('/api/auth/login', { username, password })
      const user = decodeAuthUser(res.data.accessToken)
      setAuth(res.data.accessToken, user)
      navigate('/')
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) {
        setError(t('login.error.invalidCredentials'))
      } else {
        setError(t('login.error.unexpected'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('login.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-foreground">
                {t('login.username')}
              </label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                {t('login.password')}
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('login.submitting') : t('login.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
