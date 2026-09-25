'use client'

import {
	Component,
	type ErrorInfo,
	isValidElement,
	type ReactNode,
	Suspense,
	useEffect,
} from 'react'
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
	 *
	 * @remarks
	 * When the content fails again after such a reset, the automatic resets stop.
	 * They start again after a press on the retry button. They also start again
	 * when the content of a reset commits, and its effects then run with no error.
	 */
	resetKey?: ReactNode
	/**
	 * What the boundary shows while the content suspends.
	 * @defaultValue null
	 */
	fallback?: ReactNode
	children: ReactNode
}

/** The state of {@link DashboardTileBoundary}. */
type DashboardTileBoundaryState = {
	/** The caught error, or `null`. */
	error: unknown
	/** The widget element of the last render of the content. After a throw, it is the element that failed. */
	element: ReactNode
	/**
	 * Whether a new `resetKey` can clear the error with no press. It is state, and
	 * not an instance field, so that it changes in the order of the update queue.
	 */
	armed: boolean
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
 * does not throw again on each render of the parent. A new `Map`, a new class
 * instance, or a changed primitive counts as a change. The boundary therefore
 * stops its automatic resets after one reset that fails.
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
 * Calls `onRearm` from a passive effect after its mount. The boundary puts it
 * after the content, in the same Suspense boundary. The effect therefore runs
 * only when the content commits, and after each effect of the content.
 */
function DashboardTileRearm({ onRearm }: { onRearm: () => void }): null {
	useEffect(() => {
		onRearm()
	}, [onRearm])

	return null
}

/**
 * The error boundary of one tile. A widget that throws replaces only its own
 * content with an error state, and the rest of the board keeps working. The retry
 * button renders the content again. So does a new `resetKey` that differs from
 * the element that failed.
 *
 * An automatic reset that fails again stops the automatic resets. A prop that
 * changes on each render, with an `onError` that sets app state, therefore
 * cannot loop. The retry button starts them again. So does a reset whose content
 * commits, and whose effects then run with no error.
 *
 * The boundary holds the Suspense boundary of the content. A reset that suspends
 * therefore keeps the resets off until the content commits.
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
	state: DashboardTileBoundaryState = { error: null, element: null, armed: true }

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
		const { error, element, armed } = this.state

		if (error === null || !armed || sameWidget(element, this.props.resetKey)) return

		// The resets stay off until the rearm effect of this reset, or a press.
		this.setState({ error: null, armed: false })
	}

	/**
	 * Starts the automatic resets again after the content of a reset commits. A
	 * throw in a layout effect or a passive effect of the content queues its error
	 * before this update. The update therefore finds the error, and changes nothing.
	 */
	private rearm = (): void => {
		this.setState(({ error, armed }) => (error === null && !armed ? { armed: true } : null))
	}

	retry = (): void => {
		this.setState({ error: null, armed: true })
	}

	render(): ReactNode {
		const { error, armed } = this.state

		if (error === null) {
			return (
				<Suspense fallback={this.props.fallback ?? null}>
					{this.props.children}

					{!armed && <DashboardTileRearm onRearm={this.rearm} />}
				</Suspense>
			)
		}

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
			{children}
		</DashboardTileBoundary>
	)
}
