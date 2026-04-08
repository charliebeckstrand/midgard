import { form } from '../../primitives/form'

export const textarea = {
	base: [form.input, 'min-h-9'],
	resize: {
		none: 'resize-none',
		vertical: 'resize-y',
		horizontal: 'resize-x',
	},
	defaults: { resize: 'none' as const },
}
