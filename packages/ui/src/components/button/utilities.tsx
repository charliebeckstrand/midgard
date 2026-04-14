import { Children, isValidElement } from 'react'
import { Icon } from '../icon'
import { Kbd } from '../kbd'
import { Spinner } from '../spinner'
import type { SpinnerProps } from '../spinner/component'

/** True when the node is an Icon or Spinner. */
export function isIconLike(node: React.ReactNode): boolean {
	if (!isValidElement(node)) return false

	return node.type === Icon || node.type === Spinner
}

/** Detects which sides of the button hold an icon. */
export function iconSides(children: React.ReactNode): { start: boolean; end: boolean } {
	const arr = Children.toArray(children)

	if (arr.length < 2) return { start: false, end: false }

	return {
		start: isIconLike(arr[0]),
		end: isIconLike(arr[arr.length - 1]),
	}
}

/** True when the node is a Kbd. */
export function isKbd(node: React.ReactNode): boolean {
	if (!isValidElement(node)) return false

	return node.type === Kbd
}

/** Detects which sides of the button hold a Kbd. */
export function kbdSides(children: React.ReactNode): { start: boolean; end: boolean } {
	const arr = Children.toArray(children)

	if (arr.length < 2) return { start: false, end: false }

	return {
		start: isKbd(arr[0]),
		end: isKbd(arr[arr.length - 1]),
	}
}

/** True when the button has a single icon child. */
export function isIconOnly(children: React.ReactNode): boolean {
	const arr = Children.toArray(children)

	return arr.length === 1 && isIconLike(arr[0])
}

/** Replaces a leading icon with a Spinner, or prepends one. */
export function withLoadingSpinner(
	children: React.ReactNode,
	options?: Pick<SpinnerProps, 'color' | 'size' | 'label'>,
): React.ReactNode {
	const arr = Children.toArray(children)

	const spinner = <Spinner key="loading-spinner" {...options} />

	if (arr.length > 0 && isIconLike(arr[0])) {
		return [spinner, ...arr.slice(1)]
	}

	return [spinner, ...arr]
}
