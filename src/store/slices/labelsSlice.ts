import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { Label, LabelInput } from '@/lib/types'
import { labelService } from '@/services/labels'

interface LabelsState {
  items: Label[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: LabelsState = {
  items: [],
  status: 'idle',
  error: null,
}

export const fetchLabels = createAsyncThunk('labels/fetchLabels', async () => {
  return labelService.list()
})

export const createLabel = createAsyncThunk(
  'labels/createLabel',
  async (input: LabelInput) => {
    return labelService.create(input)
  }
)

export const updateLabel = createAsyncThunk(
  'labels/updateLabel',
  async ({ id, patch }: { id: number; patch: Partial<Label> }) => {
    return labelService.update(id, patch)
  }
)

export const deleteLabel = createAsyncThunk('labels/deleteLabel', async (id: number) => {
  await labelService.remove(id)
  return id
})

const labelsSlice = createSlice({
  name: 'labels',
  initialState,
  reducers: {
    clearLabels(state) {
      state.items = []
      state.status = 'idle'
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLabels.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchLabels.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(fetchLabels.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message ?? 'Failed to load labels'
      })
      .addCase(createLabel.fulfilled, (state, action) => {
        state.items = [action.payload, ...state.items]
      })
      .addCase(updateLabel.fulfilled, (state, action) => {
        const index = state.items.findIndex((label) => label.id === action.payload?.id)
        if (index !== -1 && action.payload) {
          state.items[index] = action.payload
        }
      })
      .addCase(deleteLabel.fulfilled, (state, action) => {
        state.items = state.items.filter((label) => label.id !== action.payload)
      })
  },
})

export const { clearLabels } = labelsSlice.actions
export default labelsSlice.reducer