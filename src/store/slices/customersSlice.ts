import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { Customer } from '@/lib/types'
import { customerRepository } from '@/lib/repositories/customerRepository'

interface CustomersState {
  items: Customer[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: CustomersState = {
  items: [],
  status: 'idle',
  error: null,
}

export const fetchCustomers = createAsyncThunk('customers/fetchCustomers', async () => {
  return customerRepository.list()
})

export const addCustomer = createAsyncThunk(
  'customers/addCustomer',
  async (input: Omit<Customer, 'id' | 'createdAt'>) => {
    return customerRepository.create(input)
  }
)

export const updateCustomer = createAsyncThunk(
  'customers/updateCustomer',
  async ({ id, patch }: { id: string; patch: Partial<Customer> }) => {
    return customerRepository.update(id, patch)
  }
)

export const deleteCustomer = createAsyncThunk(
  'customers/deleteCustomer',
  async (id: string) => {
    await customerRepository.remove(id)
    return id
  }
)

const customersSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    clearCustomers(state) {
      state.items = []
      state.status = 'idle'
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message ?? 'Failed to load customers'
      })
      .addCase(addCustomer.fulfilled, (state, action) => {
        state.items = [...state.items, action.payload]
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        const index = state.items.findIndex((customer) => customer.id === action.payload?.id)
        if (index !== -1 && action.payload) {
          state.items[index] = action.payload
        }
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.items = state.items.filter((customer) => customer.id !== action.payload)
      })
  },
})

export const { clearCustomers } = customersSlice.actions
export default customersSlice.reducer