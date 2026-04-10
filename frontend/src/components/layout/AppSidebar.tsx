import { BookOpen, MapPin, BookMarked, Users, User } from 'lucide-react'
import { NavLink } from 'react-router-dom'
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

const navItems = [
  { label: 'Könyvek', icon: BookOpen, to: '/books' },
  { label: 'Helyszínek', icon: MapPin, to: '/locations' },
  { label: 'Kölcsönzések', icon: BookMarked, to: '/loans' },
  { label: 'Felhasználók', icon: Users, to: '/users' },
  { label: 'Saját profil', icon: User, to: '/profile' },
]

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Homelibrary</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(item => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) => (isActive ? 'font-semibold' : '')}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <DarkModeToggle />
      </SidebarFooter>
    </Sidebar>
  )
}
