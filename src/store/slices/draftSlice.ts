import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Customer } from '@/lib/types'

export interface LabelDraft {
  date: string
  customer: Customer | null
  weight: string
}

export const emptyDraft: LabelDraft = {
  date: '',
  customer: null,
  weight: '',
}

interface DraftState {
  draft: LabelDraft
}

const initialState: DraftState = {
  draft: emptyDraft,
}

const draftSlice = createSlice({
  name: 'draft',
  initialState,
  reducers: {
    setDraft(state, action: PayloadAction<Partial<LabelDraft>>) {
      state.draft = { ...state.draft, ...action.payload }
    },
    selectCustomer(state, action: PayloadAction<Customer>) {
      state.draft.customer = action.payload
    },
    resetDraft(state) {
      state.draft = emptyDraft
    },
  },
})

export const { setDraft, selectCustomer, resetDraft } = draftSlice.actions
export default draftSlice.reducer