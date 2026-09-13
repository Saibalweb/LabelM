import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { Invoice, InvoiceInput } from '@/lib/types'
import { invoiceRepository } from '@/lib/repositories/invoiceRepository'

interface InvoicesState {
  items: Invoice[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: InvoicesState = {
  items: [],
  status: 'idle',
  error: null,
}

export const fetchInvoices = createAsyncThunk('invoices/fetchInvoices', async () => {
  return invoiceRepository.list()
})

export const createInvoice = createAsyncThunk(
  'invoices/createInvoice',
  async (input: InvoiceInput) => {
    return invoiceRepository.create(input)
  }
)

export const updateInvoice = createAsyncThunk(
  'invoices/updateInvoice',
  async ({ id, patch }: { id: string; patch: Partial<Invoice> }) => {
    return invoiceRepository.update(id, patch)
  }
)

export const deleteInvoice = createAsyncThunk('invoices/deleteInvoice', async (id: string) => {
  await invoiceRepository.remove(id)
  return id
})

const invoicesSlice = createSlice({
  name: 'invoices',
  initialState,
  reducers: {
    clearInvoices(state) {
      state.items = []
      state.status = 'idle'
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvoices.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message ?? 'Failed to load invoices'
      })
      .addCase(createInvoice.fulfilled, (state, action) => {
        state.items = [action.payload, ...state.items]
      })
      .addCase(updateInvoice.fulfilled, (state, action) => {
        const index = state.items.findIndex((invoice) => invoice.id === action.payload?.id)
        if (index !== -1 && action.payload) {
          state.items[index] = action.payload
        }
      })
      .addCase(deleteInvoice.fulfilled, (state, action) => {
        state.items = state.items.filter((invoice) => invoice.id !== action.payload)
      })
  },
})

export const { clearInvoices } = invoicesSlice.actions
export default invoicesSlice.reducer