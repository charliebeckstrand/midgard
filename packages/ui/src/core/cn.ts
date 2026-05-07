import type { ClassValue } from 'clsx'
import clsx from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

const twMerge = extendTailwindMerge({
	extend: {
		theme: {
			spacing: ['xs', 'sm', 'md', 'lg', 'xl'],
		},
	},
})

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}
