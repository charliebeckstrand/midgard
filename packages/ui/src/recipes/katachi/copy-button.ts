import { toggleIconButton } from './toggle-icon-button'

export const copyButton = {
	base: [
		...toggleIconButton.base,
		'disabled:text-green-600 disabled:opacity-100 disabled:cursor-default',
	],
	size: toggleIconButton.size,
}
