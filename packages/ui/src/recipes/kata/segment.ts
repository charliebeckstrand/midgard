import type { VariantProps } from '../../core/recipe'
import { bridge } from '../katakana'
import { segment } from '../kiso/segment'

export const k = bridge.segment(segment)

export type SegmentControlVariants = VariantProps<typeof k.control>
export type SegmentItemVariants = VariantProps<typeof k.item>
