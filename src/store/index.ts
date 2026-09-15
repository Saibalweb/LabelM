import { configureStore } from '@reduxjs/toolkit'
import labelsReducer from '@/store/slices/labelsSlice'
import customersReducer from '@/store/slices/customersSlice'
import invoicesReducer from '@/store/slices/invoicesSlice'
import draftReducer from '@/store/slices/draftSlice'
import authReducer from '@/store/slices/authSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    labels: labelsReducer,
    customers: customersReducer,
    invoices: invoicesReducer,
    draft: draftReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch