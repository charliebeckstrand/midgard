// Rule catalog.
//
// A rule is a declarative entry describing one cadence transform:
//   category    over-granular | inconsistent | non-idiomatic | over-abstracted
//   authority   framework | repo | general — framework idiom wins (see README)
//   source      the doc citation backing the idiom
//   kind        'codemod'     mechanical, behaviour-preserving → cadence_implement
//               'escalation'  needs judgement/redesign        → cadence_diagnose
//   detect      AST predicate over a ts-morph SourceFile → findings
//   apply       (codemod) mutate the SourceFile in place, return #changes
//   diagnose    (escalation) explain why the idiom doesn't drop in cleanly
//   fixtureDir  before/after pair under fixtures/ that pins the rule
//
// detect/apply/diagnose receive the ts-morph module so rules never resolve it.

// use() is a superset of useContext (it may also be called conditionally), so the
// swap is always safe.
const useContextRule = {
	id: 'react19/use-context',
	title: 'useContext(Ctx) → use(Ctx)',
	category: 'non-idiomatic',
	authority: 'framework',
	severity: 'info',
	kind: 'codemod',
	source: { technology: 'react', version: '19', topic: 'react-19', anchor: 'Key Changes — Context: useContext → use(Context)' },
	rationale: 'React 19 reads context with use(); useContext is the React 18 form.',
	fix: 'Call use(Ctx) and import `use` from react.',
	fixtureDir: 'react19/use-context',

	detect(sf, tsm) {
		const { SyntaxKind } = tsm
		const out = []
		for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
			const text = call.getExpression().getText()
			if (text === 'useContext' || text === 'React.useContext') {
				out.push({ line: call.getStartLineNumber(), message: '`useContext(Ctx)` reads context the React 18 way; React 19 uses `use(Ctx)`.' })
			}
		}
		return out
	},

	apply(sf, tsm) {
		const { SyntaxKind } = tsm
		let changes = 0
		// Re-query each pass: a manipulation can forget previously collected nodes.
		while (changes < 1000) {
			const call = sf
				.getDescendantsOfKind(SyntaxKind.CallExpression)
				.find((c) => {
					const t = c.getExpression().getText()
					return t === 'useContext' || t === 'React.useContext'
				})
			if (!call) break
			const expr = call.getExpression()
			if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
				expr.getNameNode().replaceWithText('use')
			} else {
				expr.replaceWithText('use')
			}
			changes += 1
		}
		if (changes === 0) return 0
		const reactImport = sf.getImportDeclaration((d) => d.getModuleSpecifierValue() === 'react')
		if (reactImport) {
			const named = reactImport.getNamedImports()
			const useContext = named.find((n) => n.getName() === 'useContext')
			if (useContext) useContext.remove()
			if (!reactImport.getNamedImports().some((n) => n.getName() === 'use')) reactImport.addNamedImport('use')
		}
		return changes
	},
}

// The use() idiom is only viable with a Suspense boundary and a promise created
// outside render, and the effect may also do non-data work — so this escalates
// with a diagnosis rather than auto-fixing.
const useForAsyncRule = {
	id: 'react19/use-for-async',
	title: 'fetch-in-useEffect → use() under Suspense',
	category: 'over-granular',
	authority: 'framework',
	severity: 'warn',
	kind: 'escalation',
	source: { technology: 'react', version: '19', topic: 'react-19', anchor: 'use() Hook / Key Changes — Promise reading: useEffect → use()' },
	rationale: 'A loading/data/error effect triple is the React 18 way to read a promise; React 19 reads it with use() and lets Suspense own the pending state.',
	fix: 'Lift the fetch out of the component, pass the promise in, read it with use() under a Suspense boundary.',
	fixtureDir: 'react19/use-for-async',

	detect(sf, tsm) {
		const { SyntaxKind } = tsm
		const out = []
		for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
			if (call.getExpression().getText() !== 'useEffect') continue
			const body = call.getArguments()[0]
			if (!body) continue
			const awaits = body.getDescendantsOfKind(SyntaxKind.AwaitExpression).length > 0
			const setsState = body
				.getDescendantsOfKind(SyntaxKind.CallExpression)
				.some((c) => /^set[A-Z]/.test(c.getExpression().getText()))
			if (awaits && setsState) {
				out.push({ line: call.getStartLineNumber(), message: 'Async fetch in `useEffect` writing to state — the React 18 way to read a promise.' })
			}
		}
		return out
	},

	diagnose(sf, tsm) {
		const matches = this.detect(sf, tsm)
		if (matches.length === 0) return 'No fetch-in-effect pattern found.'
		const lines = [
			`This component reads a promise the React 18 way (${matches.map((m) => `line ${m.line}`).join(', ')}).`,
			'The React 19 idiom is `const data = use(promise)` with Suspense owning the pending state, but it does not drop in mechanically. Before rewriting, resolve:',
			'',
			'1. Is there a `<Suspense>` boundary above this component? If not, one has to be added — that is a structural change to the caller, not this file.',
			'2. Is the promise created outside render (passed in as a prop / from a cache)? `use()` must not receive a promise created during render.',
			'3. Does the effect do anything besides fetch-and-set (subscriptions, logging, imperative DOM)? Those do not move to `use()` and must stay in an effect.',
			'4. Does dropping local error state need an error boundary that does not yet exist?',
			'',
			'If 1–4 are clean: lift the fetch to the caller, pass the promise down, replace the effect+state with `use(promise)`. If not: the right move is to split the data-loading boundary out (a Suspense/error-boundary wrapper) rather than force `use()` into a component that is not shaped for it.',
		]
		return lines.join('\n')
	},
}

export const RULES = [useContextRule, useForAsyncRule]

export const RULE_IDS_FOR_SCHEMA = RULES.map((r) => r.id)

export function getRule(id) {
	return RULES.find((r) => r.id === id)
}
