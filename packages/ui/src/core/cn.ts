import type { ClassValue } from 'clsx'
import clsx from 'clsx'
import { twMerge } from './tw-merge'

/**
 * One step of the argument trie: the merged output for the arguments walked so
 * far, and the branch each further argument takes.
 *
 * @internal
 */
type MemoNode = { value?: string; next?: Map<string, MemoNode> }

/**
 * Entries the memo records before it stops. Past the cap it keeps serving what
 * it holds and merges the surplus directly, so an app with more class
 * combinations than the cap degrades to the plain merge rather than thrashing:
 * a memo that instead cleared wholesale at its cap measured *slower* than no
 * memo at all on a hundred-thousand-row grid scroll, where the clear
 * repopulated continually and every call paid the walk and the merge both.
 *
 * @internal
 */
const MEMO_CAP = 4_096

const root: MemoNode = {}

let memoized = 0

/** The trie key for one argument; every value `clsx` renders as nothing shares `''`. @internal */
function keyOf(input: string | boolean | null | undefined): string {
	return typeof input === 'string' ? input : ''
}

/**
 * Class composer for the package: `clsx` for conditional input plus
 * `tailwind-merge` extended with the project's named spacing scale
 * (`xs / sm / md / lg / xl`). Utilities like `p-md` collapse when a later
 * class overrides them.
 *
 * @remarks
 * Memoised on its arguments, which is what makes it cheap enough to call once
 * per element per render. `tailwind-merge` caches too, but on the *joined*
 * class string — and `clsx` builds that string fresh on every call, so the
 * lookup has to internalise a new key before it can read the cache, costing
 * more than the merge it was meant to skip. Keying on the arguments sidesteps
 * the join: a call site hands down the same string objects render after render
 * (a recipe's memoised output, a literal `className`), so a repeat call is a
 * couple of `Map` reads. Measured at ~20× the un-memoised call, and ~13% off a
 * ten-thousand-row grid mount.
 *
 * Only string, boolean, and nullish arguments are memoised; arrays, objects,
 * and numbers take the plain merge, carrying no stable identity to key on.
 *
 * The memo is resident for the process lifetime and never invalidates, which
 * is safe because the merge is pure — the same arguments always yield the same
 * classes — and bounded by {@link MEMO_CAP}.
 */
export function cn(...inputs: ClassValue[]): string {
	let node = root

	const recording = memoized < MEMO_CAP

	for (const input of inputs) {
		if (input != null && typeof input !== 'string' && typeof input !== 'boolean') {
			return twMerge(clsx(inputs))
		}

		const key = keyOf(input)

		let next = node.next?.get(key)

		if (!next) {
			if (!recording) return twMerge(clsx(inputs))

			next = {}

			node.next ??= new Map()

			node.next.set(key, next)
		}

		node = next
	}

	if (node.value !== undefined) return node.value

	const merged = twMerge(clsx(inputs))

	if (recording) {
		node.value = merged

		memoized++
	}

	return merged
}
