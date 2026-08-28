import { Outlet } from 'react-router-dom'
import { SideNav } from '@/components/layout/SideNav'
import { BottomNav } from '@/components/layout/BottomNav'

export function AppLayout() {
  return (
    <div className="h-screen overflow-hidden bg-background">
      <SideNav />
      <div className="flex h-full flex-col md:ml-64">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}