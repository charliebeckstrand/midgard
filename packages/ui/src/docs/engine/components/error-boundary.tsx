'use client'

import { Component, type ReactNode } from 'react'
import { Button } from '../../../components/button'
import { Heading } from '../../../components/heading'
import { Stack } from '../../../components/stack'
import { Text } from '../../../components/text'

type Props = {
	children: ReactNode

	/** Rendered in place of `children` after a caught error; `retry` clears it. */
	fallback: (retry: () => void) => ReactNode
}

type State = { error: Error | null }

/**
 * Catches a failed demo render — most importantly a rejected dynamic import (a
 * stale chunk after a deploy, an offline navigation) surfaced through
 * `use(loadDemo(...))`. Without it, one failed chunk throws past the root and
 * unmounts the whole docs site. `fallback` receives a `retry` that clears the
 * caught error so the subtree re-renders; paired with `loadDemo`'s rejection
 * eviction, the retry re-attempts the import rather than replaying the cached
 * failure. Keying the boundary by route also resets it on navigation.
 */
export class DemoErrorBoundary extends Component<Props, State> {
	state: State = { error: null }

	static getDerivedStateFromError(error: Error): State {
		return { error }
	}

	private retry = () => this.setState({ error: null })

	render() {
		if (this.state.error) return this.props.fallback(this.retry)

		return this.props.children
	}
}

/** Default fallback for {@link DemoErrorBoundary}: a message and a retry action. */
export function DemoLoadError({ onRetry }: { onRetry: () => void }) {
	return (
		<Stack gap="md" className="p-6">
			<Heading>Couldn’t load this demo</Heading>
			<Text severity="muted">
				The demo’s code failed to load — often a stale build after a deploy. Retry, or reload the
				page.
			</Text>
			<div>
				<Button variant="outline" onClick={onRetry}>
					Try again
				</Button>
			</div>
		</Stack>
	)
}
