import { cva } from 'class-variance-authority'

export const sidebarVariants = cva(
	['flex flex-col gap-4', 'bg-white', 'border-r border-gray-200', 'h-full w-64'],
	{
		variants: {
			padding: {
				none: '',
				small: 'p-2',
				medium: 'p-4',
				large: 'p-6',
			},
		},

		defaultVariants: {
			padding: 'medium',
		},
	},
)

export const sidebarInnerVariants = cva(['h-full overflow-y-auto', '', ''], {
	variants: {
		padding: {
			none: '',
			small: 'p-2',
			medium: 'p-4',
			large: 'p-6',
		},
	},

	defaultVariants: {
		padding: 'none',
	},
})
