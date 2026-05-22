import { defineRecipe, type VariantPropsOf } from '../../core/recipe'
import { segment } from '../genkei/segment'

const { control: controlBase, item: itemBase, indicator } = segment

const control = defineRecipe({ ...controlBase, defaults: { size: 'md' } })

const item = defineRecipe({ ...itemBase, defaults: { size: 'md' } })

export const k = {
	control,
	item,
	indicator,
}

export type SegmentControlVariants = VariantPropsOf<typeof control>
export type SegmentItemVariants = VariantPropsOf<typeof item>
