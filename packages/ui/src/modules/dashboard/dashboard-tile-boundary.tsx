'use client'

import { Component, type ErrorInfo, isValidElement, type ReactNode, Suspense } from 'react'
import { Button } from '../../components/button'
import { Text } from '../../components/text'
import { cn } from '../../core'
import { k } from '../../recipes/kata/dashboard'

/** Props for {@link DashboardTileBoundary}. @internal */
export type DashboardTileBoundaryProps = {
	/** The name of the tile, for the error text. */
	label: string
	/**
	 * Show no error state. The part that failed goes away. {@link DashboardTileGuard}
	 * uses this, because the chrome of a tile has no space for an error state.
	 * @defaultValue false
	 */
	quiet?: boolean
	/** Receives each error that the boundary catches. */
	onError: (error: unknown) => void
	/**
	 * The widget element. After an error, a new element that differs from the
	 * element that failed renders the content again. Without it, only the retry
	 * button does.
	 */
	resetKey?: ReactNode
	children: ReactNode
}

/** The state of {@link DashboardTileBoundary}. */
type DashboardTileBoundaryState = {
	/** The caught error, or `null`. */
	error: unknown
	/** The widget element of the last render of the content. After a throw, it is the element that failed. */
	element: ReactNode
}

/** Whether a value is a plain object: an object literal, or an object with no prototype. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null) return false

	const prototype = Object.getPrototypeOf(value)

	return prototype === Object.prototype || prototype === null
}

/**
 * Whether two widget values render the same widget. Elements match on the type,
 * the key, and the props. Arrays, plain objects, and dates compare by value, and
 * two functions count as equal. Other objects compare by reference.
 *
 * @remarks
 * A parent that renders again gives a new element, with new inline literals and
 * new callbacks. They count as no change. A widget that still throws therefore
 * does not throw again on each render of the parent. An app that sets state in
 * each report then does not loop, as long as each other object in the props
 * stays stable.
 */
function sameWidget(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true

	if (typeof a === 'function' && typeof b === 'function') return true

	if (Array.isArray(a) && Array.isArray(b)) {
		return a.length === b.length && a.every((item, index) => sameWidget(item, b[index]))
	}

	if (isValidElement(a) && isValidElement(b)) {
		return a.type === b.type && a.key === b.key && sameWidget(a.props, b.props)
	}

	if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime()

	if (!isPlainObject(a) || !isPlainObject(b)) return false

	const keys = Object.keys(a)

	return (
		keys.length === Object.keys(b).length &&
		keys.every((key) => Object.hasOwn(b, key) && sameWidget(a[key], b[key]))
	)
}

/**
 * The error boundary of one tile. A widget that throws replaces only its own
 * content with an error state, and the rest of the board keeps working. The retry
 * button renders the content again. So does a new `resetKey` that differs from
 * the element that failed.
 *
 * A quiet boundary shows nothing in place of the failed part. It has no retry,
 * so the part stays hidden until the boundary mounts again.
 *
 * @internal
 */
export class DashboardTileBoundary extends Component<
	DashboardTileBoundaryProps,
	DashboardTileBoundaryState
> {
	state: DashboardTileBoundaryState = { error: null, element: null }

	static getDerivedStateFromError(error: unknown): Partial<DashboardTileBoundaryState> {
		return { error: error ?? new Error('Unknown error') }
	}

	static getDerivedStateFromProps(
		{ resetKey }: DashboardTileBoundaryProps,
		{ error, element }: DashboardTileBoundaryState,
	): Partial<DashboardTileBoundaryState> | null {
		return error === null && element !== resetKey ? { element: resetKey } : null
	}

	componentDidCatch(error: unknown, _info: ErrorInfo): void {
		this.props.onError(error)
	}

	// After an error, `element` stays the element that failed, so an equal element resets nothing.
	componentDidUpdate(): void {
		const { error, element } = this.state

		if (error !== null && !sameWidget(element, this.props.resetKey)) this.setState({ error: null })
	}

	retry = (): void => {
		this.setState({ error: null })
	}

	render(): ReactNode {
		if (this.state.error === null) return this.props.children

		if (this.props.quiet) return null

		return (
			<div data-slot="dashboard-tile-error" role="alert" className={cn(k.error)}>
				<Text tone="muted">{this.props.label} failed to render.</Text>

				<Button onClick={this.retry}>Retry</Button>
			</div>
		)
	}
}

/** Props for {@link DashboardTileGuard}. @internal */
export type DashboardTileGuardProps = {
	/** The name of the tile. */
	label: string
	/** Receives each error that the guard catches. */
	onError: (error: unknown) => void
	children: ReactNode
}

/**
 * The guard of an app part in the chrome of a tile, for example the actions or
 * the description. The chrome is outside the boundaries of the content box. The
 * part therefore gets a quiet error boundary and a Suspense boundary with no
 * fallback. A throw hides only that part, and a suspend shows nothing.
 *
 * @remarks
 * Put the guard around the element that holds the part, not inside it. A failed
 * part then leaves no empty element, and no `aria-describedby` to an empty element.
 * @internal
 */
export function DashboardTileGuard({ label, onError, children }: DashboardTileGuardProps) {
	return (
		<DashboardTileBoundary label={label} onError={onError} quiet>
			<Suspense fallback={null}>{children}</Suspense>
		</DashboardTileBoundary>
	)
}
