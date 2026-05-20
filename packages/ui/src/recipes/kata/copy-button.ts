import { k as toggleIcon } from './toggle-icon-button'

export const k = {
	base: [
		...toggleIcon.base,
		'disabled:text-green-600 disabled:opacity-100 disabled:cursor-default',
	],
}
