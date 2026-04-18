import { tv, type VariantProps } from 'tailwind-variants'
import { omote } from '../../recipes'

export const sidebarLayoutVariants = tv({
	base: [
		'relative isolate',
		'h-svh w-full max-lg:flex-col',
		'bg-white lg:bg-zinc-100',
		'dark:bg-zinc-950',
		'overflow-hidden',
	],
})

export const sidebarPanelVariants = tv({
	base: ['w-64 shrink-0 min-w-0', 'overflow-x-hidden overflow-y-auto', 'max-lg:hidden'],
})

export const sidebarContentWrapperVariants = tv({
	base: ['flex-1', 'lg:min-w-0 lg:pt-2 lg:pr-2 pb-2 px-2', 'overflow-hidden'],
})

export const sidebarContentVariants = tv({
	base: [
		...omote.content,
		'overflow-y-auto',
		'px-6 pb-6 grow min-h-0',
		'[&:has([data-slot=footer])>[data-slot=body]]:pb-0',
	],
	variants: {
		stickyHeader: {
			true: [
				'**:data-[slot=header]:sticky',
				'**:data-[slot=header]:top-0',
				'**:data-[slot=header]:z-20',
				'**:data-[slot=header]:bg-white',
				'**:data-[slot=header]:dark:bg-zinc-950',
				'**:data-[slot=header]:dark:lg:bg-zinc-900',
			],
			false: '',
		},
	},
	defaultVariants: {
		stickyHeader: false,
	},
})

export const sidebarHeaderVariants = tv({ base: 'flex items-center shrink-0 lg:pt-6 pb-6' })

export const sidebarBodyVariants = tv({ base: 'flex-1 min-h-0 overflow-y-auto' })

export const sidebarFooterVariants = tv({ base: 'shrink-0' })

export type SidebarPanelVariants = VariantProps<typeof sidebarPanelVariants>
export type SidebarLayoutVariants = VariantProps<typeof sidebarLayoutVariants>
export type SidebarContentWrapperVariants = VariantProps<typeof sidebarContentWrapperVariants>
export type SidebarContentVariants = VariantProps<typeof sidebarContentVariants>
export type SidebarHeaderVariants = VariantProps<typeof sidebarHeaderVariants>
export type SidebarBodyVariants = VariantProps<typeof sidebarBodyVariants>
export type SidebarFooterVariants = VariantProps<typeof sidebarFooterVariants>
