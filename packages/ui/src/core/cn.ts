import type { ClassValue } from 'clsx'
import clsx from 'clsx'
import { twMerge } from './tw-merge'

/**
 * One argument's step in the memo: the merge for the path walked so far, and
 * the branch each further argument takes.
 *
 * @internal
 */
type MemoNode = { value?: string; next?: Map<string, MemoNode> }

/**
 * Nodes the memo grows to before it stops recording. A node holds its key
 * string for the process lifetime, so nodes — not entries — are the bound that
 * matters, and the only counter this module keeps.
 *
 * Past the cap `cn` keeps answering from what it holds and merges the surplus
 * directly; it never clears. A first cut that cleared wholesale at its cap
 * measured *slower* than no memo at all on a hundred-thousand-row grid scroll,
 * where the clear repopulated continually and every call paid the walk and the
 * merge both.
 *
 * Read only where a node would be created, so a call that hits never touches
 * it — a snapshot taken once per call cost ~2% of the hit path for nothing.
 *
 * @internal
 */
const MEMO_CAP = 4_096

const root: MemoNode = {}

let nodes = 0

/** Nodes the memo currently holds — the measure {@link MEMO_CAP} bounds. @internal */
export function cnMemoNodes(): number {
	return nodes
}

/**
 * Whether every argument can branch the memo. Strings branch by value; booleans
 * and nullish all render as nothing, so they share the `''` branch. Arrays,
 * objects, and numbers cannot, and send the whole call to the plain merge.
 *
 * @remarks Asked before the walk, not during it. A walk that tested as it went
 * would branch on the leading arguments and only then meet one it cannot key,
 * stranding nodes on a path no call can ever complete.
 *
 * @internal
 */
function keyable(inputs: ClassValue[]): boolean {
	for (const input of inputs) {
		if (input != null && typeof input !== 'string' && typeof input !== 'boolean') return false
	}

	return true
}

/**
 * Class composer for the package: `clsx` for conditional input plus
 * `tailwind-merge` extended with the project's named spacing scale
 * (`xs / sm / md / lg / xl`). Utilities like `p-md` collapse when a later
 * class overrides them.
 *
 * @remarks
 * Memoized on its arguments, which is what makes it cheap enough to call once
 * per element per render. `tailwind-merge` caches too, but on the *joined*
 * class string — and `clsx` builds that string fresh on every call, so the
 * lookup has to internalise a new key before it can read the cache, costing
 * more than the merge it was meant to skip. Branching on the arguments
 * sidesteps the join: a call site hands down the same string objects render
 * after render (a recipe's memoized output, a literal `className`), so a repeat
 * call is a couple of `Map` reads. Measured at ~20× the un-memoized call, and
 * ~13% off a ten-thousand-row grid mount.
 *
 * Only string, boolean, and nullish arguments are memoized; arrays, objects,
 * and numbers take the plain merge, carrying no stable identity to branch on.
 *
 * The memo is resident for the process lifetime and never invalidates, which is
 * safe because the merge is pure — the same arguments always yield the same
 * classes — and bounded by {@link MEMO_CAP}.
 */
export function cn(...inputs: ClassValue[]): string {
	if (!keyable(inputs)) return twMerge(clsx(inputs))

	let node = root

	for (const input of inputs) {
		const key = typeof input === 'string' ? input : ''

		let branch = node.next?.get(key)

		if (!branch) {
			// Asked here rather than once at entry: this is the only place a node is
			// created, so the hit path — every call on a mounted tree — never reads
			// the counter at all.
			if (nodes >= MEMO_CAP) return twMerge(clsx(inputs))

			branch = {}

			nodes++

			node.next ??= new Map()

			node.next.set(key, branch)
		}

		node = branch
	}

	if (node.value !== undefined) return node.value

	// Ungated: the walk reached the end, so every node on this path already
	// exists and counted. Recording adds a string, never a node.
	node.value = twMerge(clsx(inputs))

	return node.value
}
