import { cva, type VariantProps } from 'class-variance-authority'
import { omote } from '../../recipes'

export const sidebarLayoutVariants = cva([
	'relative isolate',
	'h-svh w-full max-lg:flex-col',
	'bg-white lg:bg-zinc-100',
	'dark:bg-zinc-950',
	'overflow-hidden',
])

export const sidebarPanelVariants = cva([
	'w-64 shrink-0 min-w-0',
	'overflow-x-hidden overflow-y-auto',
	'max-lg:hidden',
])

export const sidebarContentWrapperVariants = cva([
	'flex-1',
	'lg:min-w-0 lg:pt-2 lg:pr-2 pb-2 px-2',
	'overflow-hidden',
])

export const sidebarContentVariants = cva(
	[
		omote.content,
		'overflow-y-auto',
		'px-6 pb-6 grow min-h-0',
		'[&:has([data-slot=footer])>[data-slot=body]]:pb-0',
	],
	{
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
			},
		},
		defaultVariants: {
			stickyHeader: false,
		},
	},
)

export const sidebarHeaderVariants = cva('flex items-center shrink-0 lg:pt-6 pb-6')

export const sidebarBodyVariants = cva('flex-1 min-h-0 overflow-y-auto')

export const sidebarFooterVariants = cva('shrink-0')

export type SidebarPanelVariants = VariantProps<typeof sidebarPanelVariants>
export type SidebarLayoutVariants = VariantProps<typeof sidebarLayoutVariants>
export type SidebarContentWrapperVariants = VariantProps<typeof sidebarContentWrapperVariants>
export type SidebarContentVariants = VariantProps<typeof sidebarContentVariants>
export type SidebarHeaderVariants = VariantProps<typeof sidebarHeaderVariants>
export type SidebarBodyVariants = VariantProps<typeof sidebarBodyVariants>
export type SidebarFooterVariants = VariantProps<typeof sidebarFooterVariants>
