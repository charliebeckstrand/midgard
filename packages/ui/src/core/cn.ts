import type { ClassValue } from 'clsx'
import clsx from 'clsx'
import { twMerge } from './tw-merge'

/**
 * Class composer for the package: `clsx` for conditional input plus
 * `tailwind-merge` extended with the project's named spacing scale
 * (`xs / sm / md / lg / xl`). Utilities like `p-md` collapse when a later
 * class overrides them.
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}
