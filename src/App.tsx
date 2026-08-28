import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAppDispatch } from '@/store/hooks'
import { fetchLabels } from '@/store/slices/labelsSlice'
import { fetchCustomers } from '@/store/slices/customersSlice'
import { DashboardPage } from '@/pages/DashboardPage'
import { CreateLabelPage } from '@/pages/CreateLabelPage'
import { LabelPreviewPage } from '@/pages/LabelPreviewPage'
import { CustomersPage } from '@/pages/CustomersPage'
import { SettingsPage } from '@/pages/SettingsPage'

function App() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(fetchLabels())
    dispatch(fetchCustomers())
  }, [dispatch])

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/create" element={<CreateLabelPage />} />
        <Route path="/preview/:id" element={<LabelPreviewPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

export default App