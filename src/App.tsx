import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAppDispatch } from '@/store/hooks'
import { fetchLabels } from '@/store/slices/labelsSlice'
import { fetchCustomers } from '@/store/slices/customersSlice'
import { Dashboard } from '@/pages/dashboard'
import { Create } from '@/pages/create'
import { Preview } from '@/pages/preview'
import { Customers } from '@/pages/customers'
import { Invoices } from '@/pages/invoices'
import { Settings } from '@/pages/settings'

function App() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(fetchLabels())
    dispatch(fetchCustomers())
  }, [dispatch])

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/create" element={<Create />} />
        <Route path="/preview/:id" element={<Preview />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/invoice" element={<Invoices />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App