'use client'

import { Component, type ErrorInfo, type ReactNode, Suspense } from 'react'
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
	children: ReactNode
}

/** The state of {@link DashboardTileBoundary}: the caught error, or `null`. */
type DashboardTileBoundaryState = { error: unknown }

/**
 * The error boundary of one tile. A widget that throws replaces only its own
 * content with an error state, and the rest of the board keeps working. The retry
 * button renders the content again.
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
	state: DashboardTileBoundaryState = { error: null }

	static getDerivedStateFromError(error: unknown): DashboardTileBoundaryState {
		return { error: error ?? new Error('Unknown error') }
	}

	componentDidCatch(error: unknown, _info: ErrorInfo): void {
		this.props.onError(error)
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
