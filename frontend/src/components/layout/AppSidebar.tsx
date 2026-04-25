import { BookOpen, MapPin, BookMarked, Users, User, LogOut } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { DarkModeToggle } from '@/components/layout/DarkModeToggle'
import { useAuthStore } from '@/store/authStore'
import type { AuthUser } from '@/store/authStore'
import axiosInstance from '@/api/axiosInstance'
import type { ElementType } from 'react'

type NavItem = {
  labelKey: string
  icon: ElementType
  to: string
  roles: AuthUser['role'][]
}

const navItems: NavItem[] = [
  { labelKey: 'nav.books',     icon: BookOpen,   to: '/books',     roles: ['ADMIN', 'VISITOR'] },
  { labelKey: 'nav.locations', icon: MapPin,      to: '/locations', roles: ['ADMIN', 'VISITOR'] },
  { labelKey: 'nav.loans',     icon: BookMarked,  to: '/loans',     roles: ['ADMIN'] },
  { labelKey: 'nav.users',     icon: Users,       to: '/users',     roles: ['ADMIN'] },
  { labelKey: 'nav.profile',   icon: User,        to: '/profile',   roles: ['ADMIN', 'VISITOR'] },
]

export function AppSidebar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()

  const visibleItems = navItems.filter(item => user && item.roles.includes(user.role))

  async function handleLogout() {
    await axiosInstance.post('/api/auth/logout').catch((err: unknown) => {
      console.warn('Logout request failed:', err instanceof Error ? err.message : err)
    })
    clearAuth()
    navigate('/login')
  }

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Homelibrary</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map(item => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) => (isActive ? 'font-semibold' : '')}
                    >
                      <item.icon />
                      <span>{t(item.labelKey)}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {user && (
          <span className="px-2 py-1 text-sm text-muted-foreground truncate">{user.username}</span>
        )}
        <div className="flex items-center gap-2">
          <DarkModeToggle />
          <SidebarMenuButton onClick={handleLogout} className="flex-1">
            <LogOut />
            <span>{t('sidebar.logout')}</span>
          </SidebarMenuButton>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
