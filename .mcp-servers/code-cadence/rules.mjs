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

// React 19 makes `ref` a regular prop; forwardRef is legacy. The swap is only
// mechanical when props are destructured and the ref is forwarded straight
// through; a useImperativeHandle or a non-destructured props parameter needs a
// manual rewrite, so those occurrences are marked non-viable and escalate.
function forwardRefMatches(sf, tsm) {
	const { SyntaxKind } = tsm
	const matches = []
	for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
		const callee = call.getExpression().getText()
		if (callee !== 'forwardRef' && callee !== 'React.forwardRef') continue
		const fn = call.getArguments()[0]
		const isFn = fn && (fn.getKind() === SyntaxKind.ArrowFunction || fn.getKind() === SyntaxKind.FunctionExpression)
		const params = isFn ? fn.getParameters() : []
		const propsDestructured = params[0]?.getNameNode().getKind() === SyntaxKind.ObjectBindingPattern
		const refIsIdent = params[1]?.getNameNode().getKind() === SyntaxKind.Identifier
		const hasImperative =
			isFn &&
			fn.getDescendantsOfKind(SyntaxKind.CallExpression).some((c) => /(^|\.)useImperativeHandle$/.test(c.getExpression().getText()))
		const viable = Boolean(isFn && params.length === 2 && propsDestructured && refIsIdent && !hasImperative)
		let reason
		if (!viable) {
			if (hasImperative) reason = 'exposes an imperative handle via useImperativeHandle'
			else if (isFn && params.length === 2 && !propsDestructured) reason = 'props parameter is not destructured'
			else reason = 'unsupported forwardRef shape'
		}
		matches.push({ call, fn, line: call.getStartLineNumber(), viable, reason })
	}
	return matches
}

function transformForwardRef(call, fn) {
	const typeArgs = call.getTypeArguments()
	const [propsParam, refParam] = fn.getParameters()
	let refType
	let propsType
	if (typeArgs.length >= 2) {
		refType = typeArgs[0].getText()
		propsType = typeArgs[1].getText()
	} else {
		propsType = propsParam.getTypeNode()?.getText() ?? '{}'
		const inner = (refParam.getTypeNode()?.getText() ?? '').match(/<\s*([\s\S]+)\s*>/)
		refType = inner ? inner[1].trim() : 'unknown'
	}
	const pattern = propsParam.getNameNode().getText().replace(/^\{\s*|\s*\}$/g, '').trim()
	const binding = pattern ? `{ ref, ${pattern} }` : '{ ref }'
	const asyncKw = fn.isAsync?.() ? 'async ' : ''
	call.replaceWithText(`${asyncKw}(${binding}: ${propsType} & { ref?: Ref<${refType}> }) => ${fn.getBody().getText()}`)
}

function dropForwardRefImport(sf) {
	for (const d of sf.getImportDeclarations().filter((i) => i.getModuleSpecifierValue() === 'react')) {
		d.getNamedImports().find((n) => n.getName() === 'forwardRef')?.remove()
		if (!d.isTypeOnly() && d.getNamedImports().length === 0 && !d.getDefaultImport() && !d.getNamespaceImport()) d.remove()
	}
	const hasRef = sf
		.getImportDeclarations()
		.some((d) => d.getModuleSpecifierValue() === 'react' && d.getNamedImports().some((n) => n.getName() === 'Ref'))
	if (!hasRef) sf.insertImportDeclaration(0, { isTypeOnly: true, moduleSpecifier: 'react', namedImports: ['Ref'] })
}

const refAsPropRule = {
	id: 'react19/ref-as-prop',
	title: 'forwardRef → ref as a prop',
	category: 'non-idiomatic',
	authority: 'framework',
	severity: 'info',
	kind: 'codemod',
	source: { technology: 'react', version: '19', topic: 'react-19', anchor: 'ref as Prop / Key Changes — forwardRef: Required → ref as prop' },
	rationale: 'React 19 passes ref as a regular prop; forwardRef is legacy boilerplate.',
	fix: 'Take `ref` as a prop and drop the forwardRef wrapper.',
	fixtureDir: 'react19/ref-as-prop',

	detect(sf, tsm) {
		return forwardRefMatches(sf, tsm).map((m) => ({
			line: m.line,
			message: 'forwardRef wraps this component — in React 19 `ref` is a regular prop.',
			viable: m.viable,
			reason: m.reason,
		}))
	},

	apply(sf, tsm) {
		let changes = 0
		// Re-query each pass: a manipulation can forget previously collected nodes.
		while (changes < 1000) {
			const match = forwardRefMatches(sf, tsm).find((m) => m.viable)
			if (!match) break
			transformForwardRef(match.call, match.fn)
			changes += 1
		}
		if (changes > 0) dropForwardRefImport(sf)
		return changes
	},

	diagnose(sf, tsm) {
		const blocked = forwardRefMatches(sf, tsm).filter((m) => !m.viable)
		if (blocked.length === 0) return 'No forwardRef usage needs a manual rewrite.'
		const lines = ["These `forwardRef` wrappers can't be converted mechanically:", '']
		for (const m of blocked) lines.push(`- line ${m.line}: ${m.reason}.`)
		lines.push(
			'',
			'With an imperative handle: React 19 still takes `ref` as a prop, but keep `useImperativeHandle` and type the prop as the handle (`ref?: Ref<Handle>`) — convert by hand so the handle contract stays explicit.',
			'With a non-destructured props parameter: destructure it first (`({ ref, ...props }) =>`) so ref lands as a sibling prop, then re-run cadence_implement.',
		)
		return lines.join('\n')
	},
}

// Manual pending/error state around an async form submit is the React 18 way;
// React 19 moves the submit into useActionState with a <form action>. Escalation:
// adopting it changes how the form reads its inputs (FormData, not the event).
const useActionStateRule = {
	id: 'react19/use-action-state',
	title: 'manual form-submit state → useActionState',
	category: 'over-granular',
	authority: 'framework',
	severity: 'info',
	kind: 'escalation',
	source: { technology: 'react', version: '19', topic: 'react-19', anchor: 'useActionState / Key Changes — Form handling: Manual state → useActionState' },
	rationale: 'Tracking pending/error state by hand around a form submit is the React 18 way; React 19 uses useActionState with a form action.',
	fix: 'Move the submit into useActionState(action, initial) and drive it from <form action>.',
	fixtureDir: 'react19/use-action-state',

	detect(sf, tsm) {
		const { SyntaxKind } = tsm
		const out = []
		const fns = [
			...sf.getDescendantsOfKind(SyntaxKind.ArrowFunction),
			...sf.getDescendantsOfKind(SyntaxKind.FunctionExpression),
			...sf.getDescendantsOfKind(SyntaxKind.FunctionDeclaration),
		]
		for (const fn of fns) {
			if (!fn.isAsync?.()) continue
			const calls = fn.getDescendantsOfKind(SyntaxKind.CallExpression)
			const prevents = calls.some((c) => /\.preventDefault$/.test(c.getExpression().getText()))
			const setsState = calls.some((c) => /^set[A-Z]/.test(c.getExpression().getText()))
			const awaits = fn.getDescendantsOfKind(SyntaxKind.AwaitExpression).length > 0
			if (prevents && setsState && awaits) {
				out.push({ line: fn.getStartLineNumber(), message: 'Async form-submit handler toggling state by hand — React 19 expresses this with useActionState + <form action>.' })
			}
		}
		return out
	},

	diagnose(sf, tsm) {
		const matches = this.detect(sf, tsm)
		if (matches.length === 0) return 'No manual form-submit state found.'
		return [
			`This component submits a form and tracks pending/error state by hand (${matches.map((m) => `line ${m.line}`).join(', ')}).`,
			'React 19 expresses it with useActionState:',
			'',
			'  const [state, action, isPending] = useActionState(async (prev, formData) => { ... }, initial)',
			'',
			'driven by `<form action={action}>`, reading `isPending` from the hook instead of a manual flag. Before adopting it, resolve:',
			'',
			'1. Is this a real <form> with form controls? The action is fired by the form, not an arbitrary click handler.',
			'2. Can the handler read its inputs from the passed FormData instead of the event/refs? The action receives FormData, not the event.',
			'3. Does the handler do non-submit work (navigation, analytics, optimistic updates)? Keep that out of the action reducer.',
			'',
			'If it is a straightforward submit-and-reflect-status form, move the body into the action and drop the manual loading/error state. If it does more, split the submit concern out first.',
		].join('\n')
	},
}

// A manual optimistic update — set the optimistic value, await, revert in catch —
// is the React 18 way; React 19 uses useOptimistic and reverts automatically when
// the action settles. Escalation: the base mutation must run inside an action.
const useOptimisticRule = {
	id: 'react19/use-optimistic',
	title: 'manual optimistic update → useOptimistic',
	category: 'over-granular',
	authority: 'framework',
	severity: 'info',
	kind: 'escalation',
	source: { technology: 'react', version: '19', topic: 'react-19', anchor: 'useOptimistic / Key Changes — Optimistic UI: Manual → useOptimistic' },
	rationale: 'Setting an optimistic value and rolling it back in catch by hand is the React 18 way; React 19 uses useOptimistic.',
	fix: 'Replace the manual set/rollback with useOptimistic and run the mutation in an action.',
	fixtureDir: 'react19/use-optimistic',

	detect(sf, tsm) {
		const { SyntaxKind } = tsm
		const out = []
		const settersIn = (node) =>
			node
				.getDescendantsOfKind(SyntaxKind.CallExpression)
				.map((c) => c.getExpression().getText())
				.filter((t) => /^set[A-Z]/.test(t))
		for (const tryStmt of sf.getDescendantsOfKind(SyntaxKind.TryStatement)) {
			const catchClause = tryStmt.getCatchClause()
			if (!catchClause) continue
			const inTry = new Set(settersIn(tryStmt.getTryBlock()))
			const rollback = settersIn(catchClause.getBlock()).find((s) => inTry.has(s))
			const awaits = tryStmt.getTryBlock().getDescendantsOfKind(SyntaxKind.AwaitExpression).length > 0
			if (rollback && awaits) {
				out.push({ line: tryStmt.getStartLineNumber(), message: `Optimistic \`${rollback}\` set in try and reverted in catch — React 19 does this with useOptimistic.` })
			}
		}
		return out
	},

	diagnose(sf, tsm) {
		const matches = this.detect(sf, tsm)
		if (matches.length === 0) return 'No manual optimistic-update pattern found.'
		return [
			`This component applies an optimistic update and reverts it on failure by hand (${matches.map((m) => `line ${m.line}`).join(', ')}).`,
			'React 19 expresses it with useOptimistic:',
			'',
			'  const [optimistic, addOptimistic] = useOptimistic(state, (current, next) => ...)',
			'',
			'React reverts the optimistic value automatically when the action settles, so the catch-block rollback goes away. Before adopting it, resolve:',
			'',
			'1. Does the base mutation run inside a transition or form action? useOptimistic only reverts when the wrapping action completes.',
			'2. Is the catch a plain revert, or custom error recovery? Recovery beyond reverting still needs explicit handling.',
			'3. Is the optimistic value derived from the submitted input? The reducer receives the current state and that input.',
			'',
			'If the mutation already runs in an action and the catch only reverts, replace the manual set/rollback with useOptimistic. Otherwise wrap the mutation in an action first.',
		].join('\n')
	},
}

export const RULES = [useContextRule, useForAsyncRule, refAsPropRule, useActionStateRule, useOptimisticRule]

export const RULE_IDS_FOR_SCHEMA = RULES.map((r) => r.id)

export function getRule(id) {
	return RULES.find((r) => r.id === id)
}
