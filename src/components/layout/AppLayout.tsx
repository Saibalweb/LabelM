import { Outlet } from 'react-router-dom'
import { SideNav } from '@/components/layout/SideNav'
import { BottomNav } from '@/components/layout/BottomNav'

export function AppLayout() {
  return (
    <div className="h-screen overflow-hidden bg-background">
      <SideNav />
      <div className="flex h-full flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:ml-64 md:pb-0">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}