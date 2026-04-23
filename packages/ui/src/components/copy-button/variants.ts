import { toggleIconButton } from '../../recipes/kata/toggle-icon-button'

export const k = {
	base: [
		...toggleIconButton.base,
		'disabled:text-green-600 disabled:opacity-100 disabled:cursor-default',
	],
}
