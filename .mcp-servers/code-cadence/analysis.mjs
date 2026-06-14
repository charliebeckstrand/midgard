// ts-morph engine for the rules.
//
// ts-morph and typescript are devDependencies of packages/ui (not hoisted to the
// repo root), so they're resolved lazily from there: module load stays pure Node
// and analysis just needs the workspace installed. Parsing runs in an in-memory
// file system (review never touches disk) and source files keep their .tsx
// extension so JSX parses.

import { execFile } from 'node:child_process'
import { readFile, readdir, stat } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join, relative } from 'node:path'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { RULES, getRule } from './rules.mjs'

const execFileAsync = promisify(execFile)

const SEVERITY_RANK = { error: 3, warn: 2, info: 1 }
const SOURCE_EXT = /\.(ts|tsx)$/
const SKIP_DIRS = new Set(['node_modules', 'dist', '.next', '.git', 'coverage', '.turbo', '.kb-cache'])
const isReviewable = (file) => SOURCE_EXT.test(file) && !file.endsWith('.d.ts')

let tsmPromise

// Resolve ts-morph from packages/ui; cached across calls.
function loadTsMorph(repoRoot) {
	if (!tsmPromise) {
		tsmPromise = (async () => {
			const require = createRequire(pathToFileURL(join(repoRoot, 'packages/ui/package.json')))
			let entry
			try {
				entry = require.resolve('ts-morph')
			} catch {
				throw new Error('ts-morph is not resolvable from packages/ui — install the workspace first (`pnpm install`).')
			}
			const mod = await import(pathToFileURL(entry).href)
			return mod.Project ? mod : (mod.default ?? mod)
		})()
	}
	return tsmPromise
}

async function makeSourceFile(repoRoot, name, text) {
	const tsm = await loadTsMorph(repoRoot)
	const project = new tsm.Project({
		useInMemoryFileSystem: true,
		compilerOptions: {
			jsx: tsm.ts.JsxEmit.ReactJSX,
			target: tsm.ts.ScriptTarget.ESNext,
			allowJs: true,
		},
	})
	const sf = project.createSourceFile(name, text, { overwrite: true })
	return { tsm, sf }
}

function toFinding(rule, file, match) {
	return {
		ruleId: rule.id,
		title: rule.title,
		category: rule.category,
		authority: rule.authority,
		severity: rule.severity,
		kind: rule.kind,
		file,
		line: match.line,
		message: match.message,
		fix: rule.fix,
		rationale: rule.rationale,
		source: rule.source,
	}
}

export async function reviewSource(repoRoot, name, text, { rules } = {}) {
	const { tsm, sf } = await makeSourceFile(repoRoot, name, text)
	const active = rules?.length ? RULES.filter((r) => rules.includes(r.id)) : RULES
	const findings = []
	for (const rule of active) {
		for (const match of rule.detect(sf, tsm)) findings.push(toFinding(rule, name, match))
	}
	return findings
}

export async function applyRuleToSource(repoRoot, name, text, ruleId) {
	const rule = getRule(ruleId)
	if (!rule) throw new Error(`Unknown rule: ${ruleId}`)
	if (rule.kind !== 'codemod' || typeof rule.apply !== 'function') {
		throw new Error(`Rule ${ruleId} is an escalation rule — it has no codemod; use cadence_diagnose.`)
	}
	const { tsm, sf } = await makeSourceFile(repoRoot, name, text)
	const changes = rule.apply(sf, tsm)
	return { before: text, after: sf.getFullText(), changes }
}

export async function diagnoseSource(repoRoot, name, text, ruleId) {
	const rule = getRule(ruleId)
	if (!rule || typeof rule.diagnose !== 'function') {
		throw new Error(`Rule ${ruleId ?? '(none)'} has no diagnosis.`)
	}
	const { tsm, sf } = await makeSourceFile(repoRoot, name, text)
	return rule.diagnose(sf, tsm)
}

async function walk(dir, out) {
	let entries
	try {
		entries = await readdir(dir, { withFileTypes: true })
	} catch {
		return
	}
	for (const entry of entries) {
		const full = join(dir, entry.name)
		if (entry.isDirectory()) {
			if (!SKIP_DIRS.has(entry.name)) await walk(full, out)
		} else if (isReviewable(entry.name)) {
			out.push(full)
		}
	}
}

async function gitChanged(repoRoot) {
	const files = new Set()
	for (const args of [
		['diff', '--name-only', 'HEAD'],
		['ls-files', '--others', '--exclude-standard'],
	]) {
		try {
			const { stdout } = await execFileAsync('git', ['-C', repoRoot, ...args])
			for (const line of stdout.split('\n')) if (line.trim()) files.add(join(repoRoot, line.trim()))
		} catch {
			// git unavailable or not a repo
		}
	}
	return [...files].filter(isReviewable)
}

export async function collectFiles(repoRoot, { paths, changed } = {}) {
	const out = []
	if (paths?.length) {
		for (const p of paths) {
			const abs = join(repoRoot, p)
			let info
			try {
				info = await stat(abs)
			} catch {
				continue
			}
			if (info.isDirectory()) await walk(abs, out)
			else if (isReviewable(abs)) out.push(abs)
		}
	} else if (changed) {
		out.push(...(await gitChanged(repoRoot)))
	}
	const seen = new Set()
	const result = []
	for (const f of out.sort()) {
		if (seen.has(f)) continue
		seen.add(f)
		try {
			if ((await stat(f)).isFile()) result.push(f)
		} catch {
			// dropped between walk and stat
		}
	}
	return result
}

export async function reviewPaths(repoRoot, { paths, changed, rules, minSeverity } = {}) {
	const files = await collectFiles(repoRoot, { paths, changed })
	const findings = []
	for (const abs of files) {
		const rel = relative(repoRoot, abs)
		const text = await readFile(abs, 'utf8')
		for (const f of await reviewSource(repoRoot, rel, text, { rules })) findings.push(f)
	}
	const floor = minSeverity ? SEVERITY_RANK[minSeverity] : 0
	const filtered = floor ? findings.filter((f) => SEVERITY_RANK[f.severity] >= floor) : findings
	return { scanned: files.length, findings: filtered }
}

export async function diagnoseFile(repoRoot, path, ruleId) {
	const abs = join(repoRoot, path)
	const text = await readFile(abs, 'utf8')
	const rel = relative(repoRoot, abs)
	if (ruleId) return { ruleId, report: await diagnoseSource(repoRoot, rel, text, ruleId) }
	// No rule named: diagnose every escalation rule that fires in the file.
	const reports = []
	for (const rule of RULES) {
		if (typeof rule.diagnose !== 'function') continue
		const { tsm, sf } = await makeSourceFile(repoRoot, rel, text)
		if (rule.detect(sf, tsm).length === 0) continue
		reports.push({ ruleId: rule.id, report: rule.diagnose(sf, tsm) })
	}
	return { reports }
}

export async function applyRuleToFile(repoRoot, path, ruleId) {
	const abs = join(repoRoot, path)
	const text = await readFile(abs, 'utf8')
	const rel = relative(repoRoot, abs)
	return { abs, rel, ...(await applyRuleToSource(repoRoot, rel, text, ruleId)) }
}
