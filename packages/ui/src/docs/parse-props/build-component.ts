import {
	extractDefaults,
	extractDestructuredNames,
	findTypeAnnotationStart,
	IGNORED_PROPS,
	inferTypeFromDefault,
} from './extract-props'
import { parseTypeBody } from './parse-type-body'
import { resolveTypeBodies } from './resolve-type'
import type { ComponentApi, PropDef, ResolutionContext } from './types'

export function buildComponentFromInlineParams(
	name: string,
	paramBlock: string,
	ctx: ResolutionContext,
): ComponentApi | null {
	const colonIdx = findTypeAnnotationStart(paramBlock)

	if (colonIdx === -1) return null

	const destructured = paramBlock.slice(0, colonIdx).trim()

	const typeAnnotation = paramBlock.slice(colonIdx + 1).trim()

	const defaults = extractDefaults(destructured)

	const api = buildComponent(name, typeAnnotation, defaults, ctx)

	// Fill in any destructured params that type resolution missed (e.g. when
	// VariantProps<typeof X> uses computed variant objects the cva parser can't
	// statically resolve).
	const destructuredNames = extractDestructuredNames(destructured)

	const resolved = new Set(api.props.map((p) => p.name))

	for (const paramName of destructuredNames) {
		if (resolved.has(paramName) || IGNORED_PROPS.has(paramName)) continue

		const defaultVal = defaults.get(paramName)

		const prop: PropDef = { name: paramName, type: inferTypeFromDefault(defaultVal) }

		if (defaultVal !== undefined) prop.default = defaultVal

		api.props.push(prop)
	}

	return api
}

export function buildComponentFromTypeName(
	name: string,
	typeName: string,
	ctx: ResolutionContext,
): ComponentApi {
	return buildComponent(name, typeName, new Map(), ctx)
}

function buildComponent(
	name: string,
	annotation: string,
	defaults: Map<string, string>,
	ctx: ResolutionContext,
): ComponentApi {
	const { bodies, passThrough } = resolveTypeBodies(annotation, ctx)

	const props: PropDef[] = []

	const seen = new Set<string>()

	for (const body of bodies) {
		for (const prop of parseTypeBody(body, defaults, ctx)) {
			if (seen.has(prop.name)) continue

			seen.add(prop.name)

			props.push(prop)
		}
	}

	const api: ComponentApi = { name, props }

	if (passThrough.length > 0) api.passThrough = passThrough

	return api
}
