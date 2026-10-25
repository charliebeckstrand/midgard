import { Component, type ReactNode } from 'react'

/**
 * An error boundary for a test. It shows "Failed" in place of its children
 * when they throw, so a case can find the failure by its text.
 */
export class FailBoundary extends Component<{ children: ReactNode }, { error?: unknown }> {
	state: { error?: unknown } = {}

	static getDerivedStateFromError(error: unknown) {
		return { error }
	}

	render() {
		return this.state.error ? <p>Failed</p> : this.props.children
	}
}
