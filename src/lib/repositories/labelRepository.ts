import type { Label, LabelInput } from '@/lib/types'
import type { LabelRepository } from '@/lib/repositories/types'
import { loadLabels, nextSlNo, saveLabels, uid } from '@/lib/repositories/storage'

const LATENCY = 250

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, LATENCY))
}

function calculateTotalPrice(input: LabelInput): number {
  const subtotal = input.totalWeightKg * input.mrpPerKg
  return Math.round(subtotal * 1.05 * 100) / 100
}

class LocalStorageLabelRepository implements LabelRepository {
  async list(): Promise<Label[]> {
    await delay()
    return [...loadLabels()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  async getById(id: string): Promise<Label | null> {
    await delay()
    return loadLabels().find((label) => label.id === id) ?? null
  }

  async create(input: LabelInput): Promise<Label> {
    await delay()
    const labels = loadLabels()
    const label: Label = {
      ...input,
      id: uid(),
      slNo: input.slNo || nextSlNo(labels),
      totalPrice: calculateTotalPrice(input),
      createdAt: new Date().toISOString(),
    }
    saveLabels([label, ...labels])
    return label
  }

  async update(id: string, patch: Partial<Label>): Promise<Label | null> {
    await delay()
    const labels = loadLabels()
    const index = labels.findIndex((label) => label.id === id)
    if (index === -1) return null
    const updated: Label = {
      ...labels[index],
      ...patch,
      totalPrice: calculateTotalPrice({ ...labels[index], ...patch }),
    }
    labels[index] = updated
    saveLabels(labels)
    return updated
  }

  async remove(id: string): Promise<void> {
    await delay()
    saveLabels(loadLabels().filter((label) => label.id !== id))
  }
}

export const labelRepository: LabelRepository = new LocalStorageLabelRepository()