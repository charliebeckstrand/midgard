import { tv, type VariantProps } from 'tailwind-variants'
import { kage } from '../kage'
import { ki } from '../ki'
import { maru } from '../maru'
import { narabi } from '../narabi'
import { omote } from '../omote'
import { sumi } from '../sumi'
import { take } from '../take'

export const inspectorPanel = tv({
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
})

export const inspectorHeader = tv({
	base: ['flex items-center justify-between', take.gap.md, 'px-6 pt-6'],
})
export const inspectorTitle = tv({ base: [...narabi.panel.title] })
export const inspectorDescription = tv({ base: [...narabi.panel.description] })
export const inspectorActions = tv({ base: [narabi.panel.actions, 'px-6 pb-6'] })
export const inspectorBody = tv({ base: [narabi.panel.body, 'flex-1 overflow-y-auto px-6'] })
export const inspectorClose = tv({
	base: [...sumi.textMuted, ki.inset, maru.roundedMd, 'shrink-0', 'p-1'],
})

export type InspectorPanelVariants = VariantProps<typeof inspectorPanel>

/** Kept for the `katachi` barrel — not consumed directly. */
export const inspector = {
	panel: inspectorPanel,
	header: inspectorHeader,
	title: inspectorTitle,
	description: inspectorDescription,
	actions: inspectorActions,
	body: inspectorBody,
	close: inspectorClose,
}
