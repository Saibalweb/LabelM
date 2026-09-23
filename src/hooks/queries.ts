import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { customerService } from '@/services/customers'
import { invoiceService } from '@/services/invoices'
import { labelService } from '@/services/labels'
import { pricesService } from '@/services/prices'
import type {
  CustomerInput,
  InvoiceFilters,
  InvoiceListParams,
  InvoicePaymentInput,
  Label,
  LabelFilters,
  LabelInput,
  LabelListParams,
} from '@/lib/types'

export const queryKeys = {
  customers: ['customers'] as const,
  labels: ['labels'] as const,
  invoices: ['invoices'] as const,
}

const LIST_STALE_TIME = 30_000

export function useCustomersQuery() {
  return useQuery({
    queryKey: queryKeys.customers,
    queryFn: () => customerService.list(),
    staleTime: LIST_STALE_TIME,
  })
}

export function useLabelQuery(id: number | undefined) {
  return useQuery({
    queryKey: [...queryKeys.labels, 'detail', id],
    queryFn: () => (id != null ? labelService.getById(id) : null),
    enabled: id != null,
    staleTime: LIST_STALE_TIME,
  })
}

export function useLabelsQuery(
  filters: LabelFilters = {},
  params: LabelListParams
) {
  return useQuery({
    queryKey: [
      ...queryKeys.labels,
      'list',
      filters,
      params.page,
      params.pageSize,
      params.sortBy,
    ],
    queryFn: () => labelService.list(filters, params),
    staleTime: LIST_STALE_TIME,
    placeholderData: keepPreviousData,
  })
}

export function useUnbilledLabelsQuery(
  opts: {
    from: string
    to: string
    customerId?: number | null
  },
  enabled = true
) {
  return useQuery({
    queryKey: [...queryKeys.labels, 'unbilled', opts.from, opts.to, opts.customerId],
    queryFn: () => labelService.listUnbilled(opts),
    enabled,
    staleTime: LIST_STALE_TIME,
  })
}

export function useLabelStatsQuery() {
  return useQuery({
    queryKey: [...queryKeys.labels, 'stats'],
    queryFn: () => labelService.stats(),
    staleTime: LIST_STALE_TIME,
  })
}

export function useLabelCountsByCustomerQuery() {
  return useQuery({
    queryKey: [...queryKeys.labels, 'counts'],
    queryFn: () => labelService.countsByCustomer(),
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

export function useInvoicesQuery(filters: InvoiceFilters = {}) {
  return useQuery({
    queryKey: [...queryKeys.invoices, 'list', filters],
    queryFn: () => invoiceService.list(filters),
    staleTime: LIST_STALE_TIME,
    placeholderData: keepPreviousData,
  })
}

export function useInvoiceListQuery(
  filters: InvoiceFilters = {},
  params: InvoiceListParams
) {
  return useQuery({
    queryKey: [
      ...queryKeys.invoices,
      'list',
      filters,
      params.page,
      params.pageSize,
      params.sortBy,
    ],
    queryFn: () => invoiceService.listPage(filters, params),
    staleTime: LIST_STALE_TIME,
    placeholderData: keepPreviousData,
  })
}

export function useInvoiceQuery(id: number | undefined) {
  return useQuery({
    queryKey: [...queryKeys.invoices, 'detail', id],
    queryFn: () => (id != null ? invoiceService.getById(id) : null),
    enabled: id != null,
    staleTime: LIST_STALE_TIME,
  })
}

export function useInvoicePreviewQuery(
  from: string,
  to: string,
  enabled = true
) {
  return useQuery({
    queryKey: [...queryKeys.invoices, 'preview', from, to],
    queryFn: () => invoiceService.preview(from, to),
    enabled: enabled && !!from && !!to,
    staleTime: LIST_STALE_TIME,
  })
}

function invalidateInvoiceData(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.invoices })
  queryClient.invalidateQueries({ queryKey: queryKeys.labels })
}

export function useGenerateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      customerId,
      from,
      to,
    }: {
      customerId: number
      from: string
      to: string
    }) => invoiceService.generate(customerId, from, to),
    onSuccess: () => invalidateInvoiceData(queryClient),
  })
}

export function useBulkGenerateInvoices() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ from, to }: { from: string; to: string }) =>
      invoiceService.bulkGenerate(from, to),
    onSuccess: () => invalidateInvoiceData(queryClient),
  })
}

export function useRecordPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      invoiceId,
      payment,
    }: {
      invoiceId: number
      payment: InvoicePaymentInput
    }) => invoiceService.recordPayment(invoiceId, payment),
    onSuccess: () => invalidateInvoiceData(queryClient),
  })
}

export function useUpdatePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      invoiceId,
      paymentId,
      payment,
    }: {
      invoiceId: number
      paymentId: number
      payment: InvoicePaymentInput
    }) => invoiceService.updatePayment(invoiceId, paymentId, payment),
    onSuccess: () => invalidateInvoiceData(queryClient),
  })
}

export function useDeletePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      invoiceId,
      paymentId,
    }: {
      invoiceId: number
      paymentId: number
    }) => invoiceService.deletePayment(invoiceId, paymentId),
    onSuccess: () => invalidateInvoiceData(queryClient),
  })
}