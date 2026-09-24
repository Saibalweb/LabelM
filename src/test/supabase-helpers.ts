import { vi } from 'vitest'

export interface ChainCall {
  method: string
  args: unknown[]
}

export interface QueryResult {
  data: unknown
  error: Error | null
  count?: number | null
}

const CHAIN_METHODS = [
  'select',
  'or',
  'in',
  'is',
  'not',
  'ilike',
  'gte',
  'lt',
  'lte',
  'eq',
  'neq',
  'range',
  'order',
  'limit',
  'maybeSingle',
  'single',
  'insert',
  'update',
  'delete',
] as const

/**
 * Builds a Postgrest-builder lookalike that records every chained call and
 * resolves to a fixed result when awaited.
 */
export function createChain(result: () => QueryResult | Promise<QueryResult>) {
  const calls: ChainCall[] = []
  const query: Record<string, unknown> = {}

  for (const method of CHAIN_METHODS) {
    query[method] = vi.fn((...args: unknown[]) => {
      calls.push({ method, args })
      return query
    })
  }

  query.then = (resolve: (value: QueryResult) => void, reject: (err: unknown) => void) => {
    Promise.resolve()
      .then(result)
      .then(resolve, reject)
  }

  return { query, calls }
}

export type MockSupabase = {
  from: ReturnType<typeof vi.fn>
  rpc: ReturnType<typeof vi.fn>
  auth: {
    signInWithPassword: ReturnType<typeof vi.fn>
    signInWithOtp: ReturnType<typeof vi.fn>
    resetPasswordForEmail: ReturnType<typeof vi.fn>
    updateUser: ReturnType<typeof vi.fn>
    signOut: ReturnType<typeof vi.fn>
    verifyOtp: ReturnType<typeof vi.fn>
  }
  functions: {
    invoke: ReturnType<typeof vi.fn>
  }
}