import { Children, isValidElement } from 'react'
import { Kbd } from '../kbd'
import { Spinner } from '../spinner'

/** True for anything the button should treat as an icon — i.e., any element that isn't a <Kbd>. */
export function isIconLike(node: React.ReactNode): boolean {
	if (!isValidElement(node)) return false

	return node.type !== Kbd
}

/** Which sides of an icon + text button hold an icon */
export function iconSides(children: React.ReactNode): { start: boolean; end: boolean } {
	const arr = Children.toArray(children)

	if (arr.length < 2) return { start: false, end: false }

	return {
		start: isIconLike(arr[0]),
		end: isIconLike(arr[arr.length - 1]),
	}
}

/** True when the node is a <Kbd> child. */
export function isKbd(node: React.ReactNode): boolean {
	if (!isValidElement(node)) return false

	return node.type === Kbd
}

/** Which sides of a kbd + text button hold a Kbd */
export function kbdSides(children: React.ReactNode): { start: boolean; end: boolean } {
	const arr = Children.toArray(children)

	if (arr.length < 2) return { start: false, end: false }

	return {
		start: isKbd(arr[0]),
		end: isKbd(arr[arr.length - 1]),
	}
}

/** A single icon child — treat as icon-only */
export function isIconOnly(children: React.ReactNode): boolean {
	const arr = Children.toArray(children)

	return arr.length === 1 && isIconLike(arr[0])
}

/** Replace a leading icon with a Spinner, or prepend one if none exists */
export function withLoadingSpinner(children: React.ReactNode): React.ReactNode {
	const arr = Children.toArray(children)

	const spinner = <Spinner key="loading-spinner" />

	if (arr.length > 0 && isIconLike(arr[0])) {
		return [spinner, ...arr.slice(1)]
	}

	return [spinner, ...arr]
}
