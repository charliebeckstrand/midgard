/**
 * A message's content split into ordered parts: prose rendered as a bubble, or
 * a chart fence lifted onto its own border. @internal
 */
export type ChatSegment =
	| { kind: 'prose'; content: string }
	| {
			kind: 'chart'
			/** The fence body — a {@link ChatChartSpec} as JSON. */
			code: string
			/** Whether the fence closed; an unterminated fence is still streaming in. */
			closed: boolean
	  }

/** A line opening a ```` ```chart ```` fence (up to three leading spaces per CommonMark). */
const CHART_OPEN = /^ {0,3}```[ \t]*chart\b/

/** A line closing a fence: a bare ```` ``` ```` run. */
const FENCE_CLOSE = /^ {0,3}```[ \t]*$/

/** A line opening any fenced code block. */
const FENCE_OPEN = /^ {0,3}```/

/**
 * Split a chat message's Markdown source into ordered prose and chart segments,
 * breaking at top-level ```` ```chart ```` fences so a chart renders outside
 * the message bubble. Prose between and around charts stays intact for the
 * Markdown renderer; a ```` ```chart ```` fence inside another code block is
 * left in the prose (never split), and an unterminated trailing chart fence —
 * a chart still streaming in — becomes an open (`closed: false`) chart segment.
 *
 * A message with no chart fence returns a single prose segment holding the
 * whole source, so the common case renders exactly one bubble.
 *
 * @param source - The message's raw Markdown.
 * @returns The segments in source order; empty only for an empty source.
 */
export function splitChatSegments(source: string): ChatSegment[] {
	const segments: ChatSegment[] = []

	let prose: string[] = []

	let chart: string[] | null = null

	// Track an open non-chart fence in prose so a ```chart line inside it isn't
	// mistaken for a chart boundary.
	let proseFenceOpen = false

	const flushProse = () => {
		if (prose.length === 0) return

		const content = prose.join('\n')

		if (content.trim()) segments.push({ kind: 'prose', content })

		prose = []
	}

	for (const line of source.split('\n')) {
		if (chart !== null) {
			if (FENCE_CLOSE.test(line)) {
				segments.push({ kind: 'chart', code: chart.join('\n'), closed: true })

				chart = null
			} else {
				chart.push(line)
			}

			continue
		}

		if (proseFenceOpen) {
			prose.push(line)

			if (FENCE_OPEN.test(line)) proseFenceOpen = false

			continue
		}

		if (CHART_OPEN.test(line)) {
			flushProse()

			chart = []

			continue
		}

		if (FENCE_OPEN.test(line)) proseFenceOpen = true

		prose.push(line)
	}

	if (chart !== null) {
		// Prose was flushed when this fence opened; emit the in-flight chart.
		segments.push({ kind: 'chart', code: chart.join('\n'), closed: false })
	} else {
		flushProse()
	}

	// A source with no chart (or only whitespace) still renders one bubble.
	if (segments.length === 0) segments.push({ kind: 'prose', content: source })

	return segments
}
