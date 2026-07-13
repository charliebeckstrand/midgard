import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { type CallableApi, createExtractor, type ModuleApi } from '../extractor'

const HERE = path.dirname(fileURLToPath(import.meta.url))

const FIXTURE_DIR = path.join(HERE, 'fixtures', 'callables')

const UI_DIR = path.resolve(HERE, '../../../..')

// One extraction over the fixture package feeds every fixture-backed suite;
// the program build dominates the cost, so it runs once through the same public
// seam a build consumer uses.
let moduleApi: ModuleApi

beforeAll(() => {
	const snapshot = createExtractor({ packageDir: FIXTURE_DIR }).extract()

	const cx = snapshot.modules.cx

	if (!cx) throw new Error('fixture module missing from snapshot')

	moduleApi = cx
})

/** The named export as a `CallableApi`, failing on any other kind. */
function callable(name: string): CallableApi {
	const found = moduleApi.exports.find((entry) => entry.name === name)

	if (found?.kind !== 'hook' && found?.kind !== 'function') {
		throw new Error(`expected callable export '${name}', got ${found?.kind ?? 'nothing'}`)
	}

	return found
}

describe('kind', () => {
	it('classifies a `use*` export as a hook', () => {
		expect(callable('useThing').kind).toBe('hook')
	})

	it('classifies a plain function export', () => {
		expect(callable('identity').kind).toBe('function')
	})
})

describe('signatures', () => {
	it('models a hook parameter, its object shape, and the return type', () => {
		const sig = callable('useThing').signatures[0]

		expect(sig).toBeDefined()

		expect(sig?.params).toHaveLength(1)

		// A destructured parameter carries no source name; it is synthesized from
		// the contextual type alias, decapitalized.
		expect(sig?.params[0]?.name).toBe('thingOptions')

		expect(sig?.params[0]?.type).toBe('ThingOptions')

		expect(sig?.params[0]?.shape).toEqual({
			k: 'object',
			fields: {
				enabled: { k: 'primitive', name: 'boolean' },
				count: { k: 'primitive', name: 'number' },
			},
		})

		expect(sig?.returns.type).toBe('[number, () => number]')
	})

	it('names the type parameters of a generic function', () => {
		const identity = callable('identity')

		expect(identity.signatures).toHaveLength(1)

		const sig = identity.signatures[0]

		expect(sig?.typeParams).toEqual(['T'])

		expect(sig?.params[0]).toMatchObject({ name: 'value', type: 'T' })

		expect(sig?.returns.type).toBe('T')
	})

	it('omits `typeParams` for a non-generic signature', () => {
		expect(callable('label').signatures[0]?.typeParams).toBeUndefined()
	})

	it('models every overload and drops the implementation signature', () => {
		const convert = callable('convert')

		expect(convert.signatures).toHaveLength(2)

		expect(convert.signatures[0]?.params[0]).toMatchObject({ name: 'input', type: 'string' })

		expect(convert.signatures[0]?.returns.type).toBe('number')

		expect(convert.signatures[1]?.params[0]).toMatchObject({ name: 'input', type: 'number' })

		expect(convert.signatures[1]?.returns.type).toBe('string')
	})

	it('emits an empty parameter list for a nullary callable', () => {
		const reset = callable('reset')

		expect(reset.signatures[0]?.params).toEqual([])

		expect(reset.signatures[0]?.returns.type).toBe('number')
	})
})

describe('parameters', () => {
	it('marks an optional parameter and reads a literal default', () => {
		const params = callable('label').signatures[0]?.params ?? []

		const byName = new Map(params.map((param) => [param.name, param]))

		expect(byName.get('text')).toMatchObject({ type: 'string' })

		expect(byName.get('text')?.optional).toBeUndefined()

		expect(byName.get('tone')).toMatchObject({
			type: "'muted' | 'strong'",
			optional: true,
			default: "'muted'",
			shape: { k: 'literal-union', members: ['muted', 'strong'] },
		})

		expect(byName.get('suffix')).toMatchObject({ type: 'string', optional: true })

		expect(byName.get('suffix')?.default).toBeUndefined()
	})
})

describe('tsdoc', () => {
	it('surfaces `@param` prose onto the matching parameter', () => {
		const identity = callable('identity').signatures[0]

		expect(identity?.params[0]?.description).toBe('The value to return.')

		const tone = callable('label').signatures[0]?.params.find((param) => param.name === 'tone')

		expect(tone?.description).toBe('Emphasis level applied to the body.')
	})

	it('surfaces `@returns` prose onto the return contract', () => {
		expect(callable('identity').signatures[0]?.returns.description).toBe('The same value.')

		expect(callable('parse').signatures[0]?.returns.description).toBe('The parsed record.')
	})

	it('lifts the callable summary', () => {
		expect(callable('identity').description).toBe('Echo a value back unchanged.')
	})
})

describe('references', () => {
	it('resolves named types appearing in the return type', () => {
		const returns = callable('parse').signatures[0]?.returns

		expect(returns?.type).toBe('Parsed')

		expect(returns?.references?.Parsed).toContain('value')

		expect(returns?.references?.Parsed).toContain('ok')
	})
})

// Loose assertions by design: this proves the extractor models real `ui` hooks
// without pinning their evolving surface.
describe('canary: ui/hooks over the real ui package', () => {
	it('models `useControllable` as a hook with signatures', { timeout: 120_000 }, () => {
		const extractor = createExtractor({ packageDir: UI_DIR, packageName: 'ui' })

		const exports = extractor.extract(['ui/hooks']).modules['ui/hooks']?.exports ?? []

		const hook = exports.find((entry) => entry.name === 'useControllable')

		expect(hook?.kind).toBe('hook')

		const hookApi = hook as CallableApi

		expect(hookApi.signatures.length).toBeGreaterThanOrEqual(1)

		const sig = hookApi.signatures[0]

		expect(sig?.params.length).toBeGreaterThanOrEqual(1)

		expect(sig?.params[0]?.type).toBeTruthy()

		expect(sig?.returns.type).toBeTruthy()
	})
})
