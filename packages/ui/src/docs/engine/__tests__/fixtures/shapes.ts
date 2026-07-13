/** Local stand-in: react-node TypeShape detection is name-based. */
type ReactNode = string | number | boolean | null

/** Nested five levels — one past the classifier's depth budget. */
type Deep = { a: { b: { c: { d: { e: string } } } } }

/** Self-referential list node exercising the cycle guard. */
type Tree = { value: string; next: Tree }

/** One property per TypeShape classification branch. */
export type Cases = {
	steps: 'sm' | 'md' | 'lg'
	mixed: 'a' | 1
	flag: true | false
	text: string
	count: number
	on: boolean
	list: number[]
	layout: { gap: number; wrap: boolean }
	deep: Deep
	tree: Tree
	pick: (index: number, id?: string) => void
	pair: (a: string, b: number) => string
	content: ReactNode
	handle: symbol
	loose: string | number
}
