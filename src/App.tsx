import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { RequireAuth, RequireRole } from '@/components/auth/RequireAuth'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { restoreSession } from '@/store/slices/authSlice'
import { fetchLabels } from '@/store/slices/labelsSlice'
import { fetchCustomers } from '@/store/slices/customersSlice'
import { fetchInvoices } from '@/store/slices/invoicesSlice'
import { Login } from '@/pages/auth/login'
import { MagicLinkSent } from '@/pages/auth/magicLinkSent'
import { ForgotPassword } from '@/pages/auth/forgotPassword'
import { ResetPassword } from '@/pages/auth/resetPassword'
import { AcceptInvite } from '@/pages/auth/acceptInvite'
import { AccessRestricted } from '@/pages/auth/accessRestricted'
import { Dashboard } from '@/pages/dashboard'
import { Create } from '@/pages/create'
import { Preview } from '@/pages/preview'
import { Customers } from '@/pages/customers'
import { Invoices } from '@/pages/invoices'
import { CreateInvoice } from '@/pages/createInvoice'
import { Dues } from '@/pages/dues'
import { InvoiceDetails } from '@/pages/invoiceDetails'
import { Settings } from '@/pages/settings'
import { Team } from '@/pages/team'

function App() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)

  useEffect(() => {
    dispatch(restoreSession())
  }, [dispatch])

  useEffect(() => {
    if (!user) return
    dispatch(fetchLabels())
    dispatch(fetchCustomers())
    dispatch(fetchInvoices())
  }, [user, dispatch])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/magic-link-sent" element={<MagicLinkSent />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/unauthorized" element={<AccessRestricted />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/create" element={<Create />} />
        <Route path="/preview/:id" element={<Preview />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/invoice" element={<Invoices />} />
        <Route path="/invoice/new" element={<CreateInvoice />} />
        <Route path="/dues" element={<Dues />} />
        <Route path="/invoice/:id" element={<InvoiceDetails />} />
        <Route path="/settings" element={<Settings />} />
        <Route
          path="/team"
          element={
            <RequireRole role="admin">
              <Team />
            </RequireRole>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
