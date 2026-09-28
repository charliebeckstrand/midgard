/**
 * Counts the renders of an option row. Each row calls `useId` in `OptionImpl` when it renders.
 * A hook runs on each render, also when the React Compiler memoizes the body, so the count holds
 * under both runs.
 *
 * A suite mocks `react` with {@link withRecordedUseId}, and reads the count with
 * {@link optionRenders}. The mock is per file, so the suite sits in `boundary/`. The factory
 * imports this file directly, not the helpers barrel, which imports React.
 */

/** The call stack of each `useId` call since the last {@link clearOptionRenders}. */
const stacks: string[] = []

/**
 * The frames that each record keeps. `OptionImpl` calls `useId` itself, so its frame is the
 * second one. A short stack keeps the source-map work of each record small.
 */
const FRAMES = 4

/** `react` with a `useId` that records the stack of each call. */
export function withRecordedUseId(actual: typeof import('react')): typeof import('react') {
	return {
		...actual,
		useId: () => {
			const limit = Error.stackTraceLimit

			Error.stackTraceLimit = FRAMES

			stacks.push(new Error().stack ?? '')

			Error.stackTraceLimit = limit

			return actual.useId()
		},
	}
}

/** The renders of an option row since the last {@link clearOptionRenders}. */
export function optionRenders(): number {
	return stacks.filter((stack) => stack.includes('OptionImpl')).length
}

/** Starts a new count. */
export function clearOptionRenders(): void {
	stacks.length = 0
}
