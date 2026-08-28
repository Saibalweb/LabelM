import { configureStore } from '@reduxjs/toolkit'
import labelsReducer from '@/store/slices/labelsSlice'
import customersReducer from '@/store/slices/customersSlice'
import draftReducer from '@/store/slices/draftSlice'

export const store = configureStore({
  reducer: {
    labels: labelsReducer,
    customers: customersReducer,
    draft: draftReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch