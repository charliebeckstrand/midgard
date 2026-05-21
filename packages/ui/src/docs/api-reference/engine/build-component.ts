import type { ts } from 'ts-morph'
import type { ComponentApi } from '../types'
import { extractDefaults } from './extract-defaults'
import { extractPassThrough } from './extract-passthrough'
import { extractProjectPropNames } from './extract-project-props'
import { extractProps } from './extract-props'
import type { ComponentDecl } from './find-components'
import { getPropsAnnotation, unwrapFunctionLike } from './find-components'

/** Assemble the `ComponentApi` for one component from the focused extractors. */
export function buildComponent(decl: ComponentDecl, checker: ts.TypeChecker): ComponentApi {
	const inner = unwrapFunctionLike(decl.callable) ?? decl.callable
	const callable = inner.compilerNode as ts.SignatureDeclaration

	const annotation = getPropsAnnotation(decl.callable)?.compilerNode
	const propsType = resolvePropsType(callable, checker)

	const passThrough = annotation ? extractPassThrough(annotation, checker) : []
	const projectNames = annotation ? extractProjectPropNames(annotation, checker) : null
	const defaults = extractDefaults(callable, annotation, checker)

	const props = propsType ? extractProps(callable, propsType, projectNames, defaults, checker) : []

	const api: ComponentApi = { name: decl.name, props }

	if (passThrough.length > 0) api.passThrough = passThrough

	return api
}

function resolvePropsType(callable: ts.Node, checker: ts.TypeChecker): ts.Type | null {
	const type = checker.getTypeAtLocation(callable)
	const sig = type.getCallSignatures()[0]
	const param = sig?.parameters[0]

	if (!param) return null

	return checker.getTypeOfSymbolAtLocation(param, callable)
}
