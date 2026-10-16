/**
 * The seeded set of the quality scan (`.claude/commands/quality-scan.md` §5).
 *
 * Each seed is a past fix of one unit, with a test. The parent commit of the
 * fix holds the defect that the fix repairs, so a scan of the unit at that
 * commit must find it. The defect breaks a rule that is written at that
 * commit, because a scan refutes a claim with no written rule. The share of
 * seeds that a scan finds is its recall.
 *
 * The set spans the three kinds of finding and the tiers of the ledger. Each
 * escape of a scan becomes a new seed. Never give a seed to a sweeper or a
 * verifier: the set is the answer key that scores them.
 */

/** The kind of a finding, from `bug-verifier.md` §6.4. */
type Kind = 'bug' | 'correctness' | 'polish'

type Seed = {
	/** The fix commit. The scan reads the unit at its parent. */
	commit: string
	/** The ledger key of the unit, as `tier/unit`. */
	unit: string
	/** The kind of the defect that the fix repairs. */
	kind: Kind
}

export const QUALITY_SEEDS: readonly Seed[] = [
	{ commit: 'bacdd7b3d4', unit: 'components/toast', kind: 'bug' },
	{ commit: '2726f0faf9', unit: 'components/tooltip', kind: 'bug' },
	{ commit: 'ec4fa11968', unit: 'components/tabs', kind: 'bug' },
	{ commit: '1903bd4833', unit: 'components/tree', kind: 'bug' },
	{ commit: 'e2ab371e9d', unit: 'components/resizable', kind: 'bug' },
	{ commit: '30c81d7e7f', unit: 'components/number-input', kind: 'bug' },
	{ commit: '784a865bba', unit: 'components/checkbox', kind: 'bug' },
	{ commit: '4f01717d4d', unit: 'components/sheet', kind: 'bug' },
	{ commit: '41485b4e27', unit: 'components/search-input', kind: 'bug' },
	{ commit: '8cb85d89d6', unit: 'modules/grid', kind: 'bug' },
	{ commit: 'bd30692280', unit: 'modules/chart', kind: 'bug' },
	{ commit: '0d44547226', unit: 'modules/map', kind: 'bug' },
	{ commit: '17a6de562d', unit: 'components/nav', kind: 'correctness' },
	{ commit: 'd611ae0709', unit: 'components/radio', kind: 'correctness' },
	{ commit: '816c748ccc', unit: 'components/kanban', kind: 'correctness' },
	{ commit: '6963b1b7a1', unit: 'components/odometer', kind: 'correctness' },
	{ commit: '140d77bb47', unit: 'components/rating', kind: 'correctness' },
	{ commit: 'a9147be08e', unit: 'components/calendar', kind: 'polish' },
	{ commit: '953e10c375', unit: 'components/text', kind: 'polish' },
	{ commit: 'aa1b6e6768', unit: 'components/toolbar', kind: 'polish' },
]
