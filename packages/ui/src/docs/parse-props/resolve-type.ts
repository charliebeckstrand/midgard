import { cvaVariantsToTypeBody } from './cva'
import { extractInlineObjectType, splitAtTopLevel } from './scanner'
import type { PassThrough, ResolutionContext } from './types'

type ResolvedType = {
	bodies: string[]
	passThrough: PassThrough[]
}

export function resolveTypeBodies(
	annotation: string,
	ctx: ResolutionContext,
	visited: Set<string> = new Set(),
): ResolvedType {
	const bodies: string[] = []

	const passThrough: PassThrough[] = []

	const trimmed = annotation.trim()

	if (!trimmed) return { bodies, passThrough }

	// Split on top-level `|` for union types — keep each branch
	const unionParts = splitAtTopLevel(trimmed, '|')

	if (unionParts.length > 1) {
		for (const part of unionParts) {
			const resolved = resolveTypeBodies(part, ctx, visited)

			bodies.push(...resolved.bodies)

			passThrough.push(...resolved.passThrough)
		}
		return { bodies, passThrough: dedupePassThrough(passThrough) }
	}

	// Split on top-level `&` for intersection types
	const parts = splitAtTopLevel(trimmed, '&')

	for (const part of parts) {
		const p = part.trim()

		if (!p) continue

		// Parenthesized group — unwrap and recurse
		if (p.startsWith('(') && p.endsWith(')')) {
			const inner = p.slice(1, -1)

			const resolved = resolveTypeBodies(inner, ctx, visited)

			bodies.push(...resolved.bodies)

			passThrough.push(...resolved.passThrough)

			continue
		}

		// Inline object type `{ ... }`
		const inlineBrace = extractInlineObjectType(p)

		if (inlineBrace && inlineBrace.trim() === p) {
			bodies.push(inlineBrace)

			continue
		}

		// Pass-through: React.ComponentPropsWithoutRef<'element'> (optionally wrapped in Omit/Pick)
		const pt = detectPassThrough(p)

		if (pt) {
			passThrough.push(pt)

			continue
		}

		// Omit<Ref, keys> — resolve Ref, then filter the omitted keys from its body
		const omitMatch = p.match(/^Omit\s*<\s*([\s\S]+?)\s*,\s*([\s\S]+)\s*>$/)

		if (omitMatch) {
			const [, innerType, rawKeys] = omitMatch

			const omittedKeys = parseStringKeys(rawKeys)

			const resolved = resolveTypeBodies(innerType, ctx, visited)

			for (const body of resolved.bodies) {
				bodies.push(filterBodyKeys(body, omittedKeys))
			}

			for (const rpt of resolved.passThrough) {
				passThrough.push({
					element: rpt.element,
					omitted: Array.from(new Set([...(rpt.omitted ?? []), ...omittedKeys])),
				})
			}

			continue
		}

		// Pick<Ref, keys> — resolve Ref and keep only the given keys
		const pickMatch = p.match(/^Pick\s*<\s*([\s\S]+?)\s*,\s*([\s\S]+)\s*>$/)

		if (pickMatch) {
			const [, innerType, rawKeys] = pickMatch

			const keptKeys = new Set(parseStringKeys(rawKeys))

			const resolved = resolveTypeBodies(innerType, ctx, visited)

			for (const body of resolved.bodies) {
				bodies.push(keepBodyKeys(body, keptKeys))
			}

			continue
		}

		// Named type reference — resolve recursively
		const nameMatch = p.match(/^(\w+)(?:<[^>]*>)?$/)

		if (nameMatch) {
			const refName = nameMatch[1]

			if (!refName || visited.has(refName)) continue

			const typeDef = ctx.typeDefs.get(refName)

			if (typeDef) {
				const nextVisited = new Set(visited)

				nextVisited.add(refName)

				const resolved = resolveTypeBodies(typeDef, ctx, nextVisited)

				bodies.push(...resolved.bodies)

				passThrough.push(...resolved.passThrough)

				continue
			}

			// Direct VariantProps<typeof X>
			const vpInline = p.match(/^VariantProps<typeof\s+(\w+)>$/)

			if (vpInline) {
				const variants = ctx.cvaVariants.get(vpInline[1])

				if (variants) bodies.push(cvaVariantsToTypeBody(variants))
			}
		}
	}

	return { bodies, passThrough: dedupePassThrough(passThrough) }
}

function detectPassThrough(part: string): PassThrough | null {
	// React.ComponentPropsWithoutRef<'span'> or ComponentPropsWithoutRef<'button'>
	const cpr = part.match(
		/^(?:React\.)?Component(?:Props(?:WithoutRef|WithRef)?|PropsWithRef|PropsWithoutRef)\s*<\s*['"](\w+)['"]\s*>$/,
	)

	if (cpr) return { element: cpr[1] ?? '' }

	// React.HTMLAttributes<HTMLButtonElement> / React.ButtonHTMLAttributes<HTMLButtonElement>
	const htmlAttrs = part.match(/^(?:React\.)?\w*HTMLAttributes\s*<\s*HTML(\w+)Element\s*>$/)

	if (htmlAttrs) {
		const tag = (htmlAttrs[1] ?? '').toLowerCase() || 'element'

		return { element: tag }
	}

	// Package-wide helper: PolymorphicProps<'button'> resolves to an HTML element pass-through.
	// Defined in primitives/polymorphic.tsx — detected here by name so it works without
	// needing full TypeScript generic resolution.
	const poly = part.match(/^PolymorphicProps\s*<\s*['"](\w+)['"]\s*>$/)

	if (poly) return { element: poly[1] ?? '' }

	return null
}

function parseStringKeys(raw: string): string[] {
	return splitAtTopLevel(raw, '|')
		.map((s) => s.trim().replace(/^['"`]|['"`]$/g, ''))
		.filter(Boolean)
}

function filterBodyKeys(body: string, omittedKeys: string[]): string {
	if (omittedKeys.length === 0) return body

	const omit = new Set(omittedKeys)

	const inner = body.slice(1, -1)

	const kept: string[] = []

	for (const entry of splitAtTopLevel(inner, ';', '\n')) {
		const match = entry.trim().match(/^['"`]?([\w-]+)['"`]?\s*\??:/)

		if (match && omit.has(match[1] ?? '')) continue

		kept.push(entry.trim())
	}

	return `{ ${kept.join('; ')} }`
}

function keepBodyKeys(body: string, keptKeys: Set<string>): string {
	const inner = body.slice(1, -1)

	const kept: string[] = []

	for (const entry of splitAtTopLevel(inner, ';', '\n')) {
		const match = entry.trim().match(/^['"`]?([\w-]+)['"`]?\s*\??:/)

		if (!match || !keptKeys.has(match[1] ?? '')) continue

		kept.push(entry.trim())
	}

	return `{ ${kept.join('; ')} }`
}

function dedupePassThrough(items: PassThrough[]): PassThrough[] {
	const out: PassThrough[] = []

	const seen = new Set<string>()

	for (const item of items) {
		if (seen.has(item.element)) continue

		seen.add(item.element)

		out.push(item)
	}

	return out
}
