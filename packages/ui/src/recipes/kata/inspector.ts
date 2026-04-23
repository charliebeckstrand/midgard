import { tv, type VariantProps } from 'tailwind-variants'
import { iro } from '../iro'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { narabi } from '../narabi'
import { omote } from '../omote'
import { sen } from '../sen'
import { definePanelRecipe } from './_panel'

export const inspector = definePanelRecipe({
	panel: tv({
		base: [...omote.panel.bg, narabi.panel.base, 'relative h-full'],
		variants: {
			side: {
				right: ['border-l', ...sen.borderColor],
				left: ['border-r', ...sen.borderColor],
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
	header: { base: ['flex items-center justify-between', kumi.gap.md, 'px-6 pt-6'] },
	actions: { extra: 'px-6 pb-6' },
	body: { extra: ['flex-1 overflow-y-auto px-6'] },
	close: { base: [...iro.text.muted, sen.focus.inset, maru.rounded.md, 'shrink-0', 'p-1'] },
})

export type InspectorPanelVariants = VariantProps<typeof inspector.panel>
