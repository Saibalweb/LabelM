import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { customerService } from '@/services/customers'
import { labelService } from '@/services/labels'
import { pricesService } from '@/services/prices'
import type { CustomerInput, Label, LabelInput } from '@/lib/types'

export const queryKeys = {
  customers: ['customers'] as const,
  labels: ['labels'] as const,
}

const LIST_STALE_TIME = 30_000

export function useCustomersQuery() {
  return useQuery({
    queryKey: queryKeys.customers,
    queryFn: () => customerService.list(),
    staleTime: LIST_STALE_TIME,
  })
}

export function useLabelsQuery() {
  return useQuery({
    queryKey: queryKeys.labels,
    queryFn: () => labelService.list(),
    staleTime: LIST_STALE_TIME,
  })
}

export function useAddCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CustomerInput) => customerService.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.customers }),
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<CustomerInput> }) =>
      customerService.update(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.customers }),
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => customerService.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.customers }),
  })
}

export function useSetCustomerRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, rate }: { customerId: number; rate: number }) =>
      pricesService.setRate(customerId, rate),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.customers }),
  })
}

export function useCreateLabel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: LabelInput) => labelService.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.labels }),
  })
}

export function useUpdateLabel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<Label> }) =>
      labelService.update(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.labels }),
  })
}

export function useDeleteLabel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => labelService.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.labels }),
  })
}

