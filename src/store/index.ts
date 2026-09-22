import { configureStore } from '@reduxjs/toolkit'
import draftReducer from '@/store/slices/draftSlice'
import authReducer from '@/store/slices/authSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    draft: draftReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch