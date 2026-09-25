'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '../../components/button'
import { Text } from '../../components/text'
import { cn } from '../../core'
import { k } from '../../recipes/kata/dashboard'

/** Props for {@link DashboardTileBoundary}. @internal */
export type DashboardTileBoundaryProps = {
	/** The name of the tile, for the error text. */
	label: string
	/**
	 * Show no error state. The part that failed goes away. The actions slot uses
	 * this, because the header row has no space for an error state.
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
