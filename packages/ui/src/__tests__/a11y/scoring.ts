/**
 * Weighted 0–100 accessibility score derived from axe-core violations.
 *
 * axe reports defects, not a score — it buckets each violation by `impact`
 * (minor/moderate/serious/critical) and lists the offending DOM `nodes`. We
 * turn that into a single comparable number: every violating node deducts
 * points by its impact weight, and the score is `100 − deductions`, clamped to
 * `[0, 100]`. Per-node (not per-rule) so a defect repeated across ten elements
 * costs ten times one, matching how a user experiences it.
 *
 * The score is a regression/health metric, not a WCAG conformance claim: jsdom
 * can't evaluate contrast or geometry (those rules are disabled in
 * helpers/axe.ts), so a perfect score means "clean on everything axe can see
 * statically", nothing more.
 */

export type Impact = 'minor' | 'moderate' | 'serious' | 'critical'

/**
 * Points deducted per violating node. Roughly an order of magnitude between
 * adjacent levels at the top so a single critical defect dominates a fistful of
 * minor ones, without any one violation necessarily zeroing the score.
 */
export const IMPACT_WEIGHTS: Readonly<Record<Impact, number>> = {
	critical: 10,
	serious: 5,
	moderate: 2,
	minor: 1,
}

export const IMPACTS: readonly Impact[] = ['critical', 'serious', 'moderate', 'minor']

/** Structural shape of the fields we read off an axe `Result`. */
export type Violationish = {
	readonly impact?: Impact | 'minor' | null
	readonly nodes: readonly unknown[]
}

export type ScoreBreakdown = {
	/** Weighted score in `[0, 100]`, rounded to a whole number. */
	readonly score: number
	/** Total points deducted before clamping. */
	readonly deductions: number
	/** Number of violating nodes per impact level. */
	readonly counts: Readonly<Record<Impact, number>>
}

/**
 * axe leaves `impact` as `null` for some results; treat an absent or unknown
 * impact as `minor` so it still costs a point rather than silently scoring free.
 */
function normalizeImpact(impact: Violationish['impact']): Impact {
	if (impact && impact in IMPACT_WEIGHTS) return impact as Impact

	return 'minor'
}

function emptyCounts(): Record<Impact, number> {
	return { critical: 0, serious: 0, moderate: 0, minor: 0 }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function scoreViolations(violations: readonly Violationish[]): ScoreBreakdown {
	const counts = emptyCounts()

	for (const violation of violations) {
		const impact = normalizeImpact(violation.impact)

		counts[impact] += violation.nodes.length
	}

	const deductions = IMPACTS.reduce(
		(sum, impact) => sum + counts[impact] * IMPACT_WEIGHTS[impact],
		0,
	)

	return {
		score: clamp(Math.round(100 - deductions), 0, 100),
		deductions,
		counts,
	}
}
