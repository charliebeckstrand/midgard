/**
 * Sample windows for benches whose iterations outrun Vitest's 500ms default.
 *
 * A window that takes only ten-odd samples swings run to run — enough to read
 * a genuine tie as a loss — so the heavy scenarios widen it to buy the sample
 * count their iteration cost denies them. Shared by both suites: the jsdom
 * harness and the browser one hold the same two windows, so a scenario's
 * sampling is a property of what it measures, not of which file declares it.
 */

/** The two windows, keyed by what makes an iteration slow. */
export const WINDOW = {
	/** Heavy single-shot iterations — mounts, updates, sorts, resizes. */
	slow: { time: 2_000 },
	/** Many-frame settled iterations — pointer sweeps, emphasis flips, scroll round trips. */
	settled: { time: 2_500 },
} as const
