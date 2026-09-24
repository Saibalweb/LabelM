import { describe, expect, it } from 'vitest'
import reducer, {
  emptyDraft,
  resetDraft,
  selectCustomer,
  setDraft,
  type LabelDraft,
} from '@/store/slices/draftSlice'
import type { Customer } from '@/lib/types'

const customer: Customer = {
  id: 7,
  name: 'Acme Trading',
  address: null,
  phone: null,
  email: null,
  gst_number: null,
  currentRate: 42,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('draftSlice initialState', () => {
  it('starts with an empty draft', () => {
    const state = reducer(undefined, { type: 'unknown' })
    expect(state.draft).toEqual(emptyDraft)
  })
})

describe('setDraft', () => {
  it('merges partial updates into the draft', () => {
    let state = reducer(undefined, setDraft({ date: '2026-09-24' }))
    expect(state.draft.date).toBe('2026-09-24')
    expect(state.draft.customer).toBeNull()
    expect(state.draft.weight).toBe('')

    state = reducer(state, setDraft({ weight: '12.5' }))
    expect(state.draft.date).toBe('2026-09-24')
    expect(state.draft.weight).toBe('12.5')

    state = reducer(state, setDraft({ date: '2026-09-25' }))
    expect(state.draft.date).toBe('2026-09-25')
    expect(state.draft.weight).toBe('12.5')
  })

  it('does not mutate the original empty draft', () => {
    const state = reducer(undefined, setDraft({ weight: '3' }))
    expect(state.draft).not.toBe(emptyDraft)
    expect(emptyDraft.weight).toBe('')
  })
})

describe('selectCustomer', () => {
  it('stores the selected customer in the draft', () => {
    const state = reducer(undefined, selectCustomer(customer))
    expect(state.draft.customer).toEqual(customer)
  })

  it('keeps previously entered date and weight', () => {
    let state = reducer(undefined, setDraft({ date: '2026-09-24', weight: '5' }))
    state = reducer(state, selectCustomer(customer))
    expect(state.draft).toEqual({ date: '2026-09-24', customer, weight: '5' })
  })
})

describe('resetDraft', () => {
  it('restores the empty draft and replaces the customer', () => {
    let state = reducer(
      undefined,
      setDraft({ date: '2026-09-24', weight: '5', customer })
    )
    state = reducer(state, resetDraft())
    expect(state.draft).toEqual(emptyDraft)
    expect(state.draft.customer).toBeNull()
  })
})

describe('LabelDraft shape', () => {
  it('exposes a typed empty draft constant', () => {
    const draft: LabelDraft = emptyDraft
    expect(draft).toMatchObject({ date: '', customer: null, weight: '' })
  })
})