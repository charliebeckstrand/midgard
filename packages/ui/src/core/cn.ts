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

/**
 * Class composer for the package — `clsx` for conditional input plus
 * `tailwind-merge` extended with the project's named spacing scale
 * (`xs / sm / md / lg / xl`) so utilities like `p-md` collapse cleanly when
 * a later class overrides them.
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}
