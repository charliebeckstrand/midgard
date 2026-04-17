import { waku } from '../waku'

export const select = {
	base: [
		...waku.input,
		'appearance-none',
		'pr-[calc(--spacing(10))]',
		'dark:[color-scheme:dark]',
	],
}
