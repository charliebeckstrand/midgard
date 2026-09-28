'use client'

import { useState } from 'react'

/**
 * Holds a value at its previous reference while `same` reports the two equal. A
 * render that resolved the same facts therefore hands the memos below it the
 * identity they already hold.
 *
 * Use it where a memo would otherwise list a content key in place of what it
 * reads. The memo lists the held value, which is what it reads, so the React
 * Compiler can keep the memoization (CONVENTIONS.md §10.7).
 *
 * @remarks The held value is state. A value that `same` rejects updates the
 * state during render, so React renders the component again at once with the
 * new value, before it commits. Each change of content thus costs one more
 * render pass, and a render with the same content costs none.
 *
 * @param candidate - The value of this render.
 * @param same - Whether the held value and the candidate have the same content.
 * @returns The held value while the content is the same, else the candidate.
 * @internal
 */
export function useStableValue<T>(candidate: T, same: (previous: T, next: T) => boolean): T {
	const [stable, setStable] = useState(() => candidate)

	if (stable !== candidate && !same(stable, candidate)) {
		setStable(() => candidate)

		return candidate
	}

	return stable
}
