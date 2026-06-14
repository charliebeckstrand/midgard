// Tested morals: every rule is pinned by a fixture. Mechanical rules must turn
// input.tsx into output.tsx (compared whitespace-normalised, since Biome owns
// final formatting in the real pipeline); escalation rules must fire and produce
// a diagnosis. Run with: node --test .mcp-servers/code-cadence/rules.test.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { applyRuleToSource, diagnoseSource, reviewSource } from './analysis.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..')
const read = (p) => readFileSync(join(here, 'fixtures', p), 'utf8')
// Compare structure, not formatting: Biome owns quotes/semicolons/whitespace in
// the real pipeline (cadence_implement runs `biome check --write` after a codemod).
const norm = (s) =>
	s
		.replace(/;/g, '')
		.replace(/['"]/g, '"')
		.replace(/\s+/g, ' ')
		.trim()

test('react19/use-context: detected, and the codemod produces the idiom', async () => {
	const input = read('react19/use-context/input.tsx')
	const expected = read('react19/use-context/output.tsx')

	const findings = await reviewSource(repoRoot, 'Swatch.tsx', input)
	assert.ok(
		findings.some((f) => f.ruleId === 'react19/use-context'),
		'expected react19/use-context to be detected',
	)

	const { after, changes } = await applyRuleToSource(repoRoot, 'Swatch.tsx', input, 'react19/use-context')
	assert.ok(changes > 0, 'expected at least one change')
	assert.equal(norm(after), norm(expected))
	assert.doesNotMatch(after, /useContext/, 'useContext should be gone from the output')
	assert.match(after, /\buse\(/)
})

test('react19/ref-as-prop: detected, and the codemod drops forwardRef for a ref prop', async () => {
	const input = read('react19/ref-as-prop/input.tsx')
	const expected = read('react19/ref-as-prop/output.tsx')

	const findings = await reviewSource(repoRoot, 'Input.tsx', input)
	const finding = findings.find((f) => f.ruleId === 'react19/ref-as-prop')
	assert.ok(finding, 'expected react19/ref-as-prop to be detected')
	assert.equal(finding.kind, 'codemod')

	const { after, changes } = await applyRuleToSource(repoRoot, 'Input.tsx', input, 'react19/ref-as-prop')
	assert.ok(changes > 0, 'expected at least one change')
	assert.equal(norm(after), norm(expected))
	assert.doesNotMatch(after, /forwardRef/, 'forwardRef should be gone from the output')
})

test('react19/ref-as-prop: useImperativeHandle is an escalation, not a codemod', async () => {
	const input = read('react19/ref-as-prop/imperative.input.tsx')

	const findings = await reviewSource(repoRoot, 'Dialog.tsx', input)
	const finding = findings.find((f) => f.ruleId === 'react19/ref-as-prop')
	assert.ok(finding, 'expected react19/ref-as-prop to be detected')
	assert.equal(finding.kind, 'escalation', 'imperative-handle case must escalate, not auto-fix')

	const { after, changes } = await applyRuleToSource(repoRoot, 'Dialog.tsx', input, 'react19/ref-as-prop')
	assert.equal(changes, 0, 'a non-viable forwardRef must not be transformed')
	assert.equal(after, input)

	const report = await diagnoseSource(repoRoot, 'Dialog.tsx', input, 'react19/ref-as-prop')
	assert.match(report, /imperative handle/i)
})

test('react19/use-for-async: detected as an escalation with a diagnosis', async () => {
	const input = read('react19/use-for-async/input.tsx')

	const findings = await reviewSource(repoRoot, 'UserName.tsx', input)
	const finding = findings.find((f) => f.ruleId === 'react19/use-for-async')
	assert.ok(finding, 'expected react19/use-for-async to be detected')
	assert.equal(finding.kind, 'escalation')

	const report = await diagnoseSource(repoRoot, 'UserName.tsx', input, 'react19/use-for-async')
	assert.match(report, /Suspense/)
	assert.match(report, /use\(/)
})

test('escalation rules expose no codemod path', async () => {
	const input = read('react19/use-for-async/input.tsx')
	await assert.rejects(
		() => applyRuleToSource(repoRoot, 'UserName.tsx', input, 'react19/use-for-async'),
		/escalation rule/,
	)
})
