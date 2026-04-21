import { tv, type VariantProps } from 'tailwind-variants'
import { definePanelRecipe } from '../../core/recipe'
import { kage } from '../kage'
import { ki } from '../ki'
import { maru } from '../maru'
import { narabi } from '../narabi'
import { omote } from '../omote'
import { sumi } from '../sumi'
import { take } from '../take'

export const inspector = definePanelRecipe({
	panel: tv({
		base: [...omote.panel.bg, narabi.panel.base, 'relative h-full'],
		variants: {
			side: {
				right: ['border-l', ...kage.borderColor],
				left: ['border-r', ...kage.borderColor],
			},
			size: {
				sm: 'w-72',
				md: 'w-84',
				lg: 'w-96',
				xl: 'w-108',
			},
		},
		defaultVariants: { side: 'right', size: 'md' },
	}),
	header: { base: ['flex items-center justify-between', take.gap.md, 'px-6 pt-6'] },
	actions: { extra: 'px-6 pb-6' },
	body: { extra: ['flex-1 overflow-y-auto px-6'] },
	close: { base: [...sumi.textMuted, ki.inset, maru.roundedMd, 'shrink-0', 'p-1'] },
})

export type InspectorPanelVariants = VariantProps<typeof inspector.panel>
