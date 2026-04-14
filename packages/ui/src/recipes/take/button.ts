import { gap, iconSlot, text } from './density'

/** Asymmetric padding opposite the icon to balance visual weight. */
export const buttonWithIcon = {
	start: {
		xs: 'pr-[calc(--spacing(1.5)-1px)]',
		sm: 'pr-[calc(--spacing(2)-1px)]',
		md: 'pr-[calc(--spacing(3)-1px)]',
		lg: 'pr-[calc(--spacing(4)-1px)]',
	},
	end: {
		xs: 'pl-[calc(--spacing(1.5)-1px)]',
		sm: 'pl-[calc(--spacing(2)-1px)]',
		md: 'pl-[calc(--spacing(3)-1px)]',
		lg: 'pl-[calc(--spacing(4)-1px)]',
	},
}

/** Icon-only button dimensions. */
export const buttonWithIconSize = { xs: 'size-6', sm: 'size-7', md: 'size-9', lg: 'size-11' }

/** Asymmetric padding opposite a Kbd child — half the icon offset. */
export const buttonWithKbd = {
	start: {
		xs: 'pr-[calc(--spacing(1)-1px)]',
		sm: 'pr-[calc(--spacing(1.5)-1px)]',
		md: 'pr-[calc(--spacing(2)-1px)]',
		lg: 'pr-[calc(--spacing(3)-1px)]',
	},
	end: {
		xs: 'pl-[calc(--spacing(1)-1px)]',
		sm: 'pl-[calc(--spacing(1.5)-1px)]',
		md: 'pl-[calc(--spacing(2)-1px)]',
		lg: 'pl-[calc(--spacing(3)-1px)]',
	},
}

/** Gap override when a spinner is present. */
export const buttonWithSpinner = {
	xs: 'has-[[data-slot=spinner]]:gap-1',
	sm: 'has-[[data-slot=spinner]]:gap-1.5',
	md: 'has-[[data-slot=spinner]]:gap-2',
	lg: 'has-[[data-slot=spinner]]:gap-2.5',
}

/** Button density — padding, gap, text, icon slot, and spinner gap per step. */
export const button = {
	xs: [
		'px-[calc(--spacing(1)-1px)] py-[calc(--spacing(1)-1px)]',
		gap.xs,
		text.xs,
		iconSlot.xs,
		buttonWithSpinner.xs,
	],
	sm: [
		'px-[calc(--spacing(1.5)-1px)] py-[calc(--spacing(1.5)-1px)]',
		gap.sm,
		text.sm,
		iconSlot.sm,
		buttonWithSpinner.sm,
	],
	md: [
		'px-[calc(--spacing(2)-1px)] py-[calc(--spacing(2)-1px)]',
		gap.md,
		text.md,
		iconSlot.md,
		buttonWithSpinner.md,
	],
	lg: [
		'px-[calc(--spacing(3)-1px)] py-[calc(--spacing(2.5)-1px)]',
		gap.lg,
		text.lg,
		iconSlot.lg,
		buttonWithSpinner.lg,
	],
}
