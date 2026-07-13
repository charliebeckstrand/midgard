import type { CallableApi, ParamApi, SignatureApi } from 'docs/extractor'
import { Badge } from 'ui/badge'
import { Heading } from 'ui/heading'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { DefaultValue } from './default-value'
import { DocDescription } from './doc-description'
import { TypeReference } from './type-cell'

/** The `name(a, b)` signature line, with type parameters when the overload is generic. */
function signatureHeading(name: string, signature: SignatureApi): string {
	const generics = signature.typeParams?.length ? `<${signature.typeParams.join(', ')}>` : ''

	const params = signature.params.map((p) => `${p.name}${p.optional ? '?' : ''}`).join(', ')

	return `${name}${generics}(${params})`
}

/**
 * A hook or function export: its description, then each overload signature with
 * a parameter list and a return row. Types reuse the same badges, reference
 * sheets, and `{@link}` prose as the component props table.
 */
export function CallableEntry({ entry }: { entry: CallableApi }) {
	return (
		<Stack gap="lg">
			{entry.description && <DocDescription description={entry.description} />}
			{entry.signatures.map((signature, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: overloads are a static ordered list
				<Signature key={index} name={entry.name} signature={signature} />
			))}
		</Stack>
	)
}

function Signature({ name, signature }: { name: string; signature: SignatureApi }) {
	return (
		<Stack gap="md">
			<Heading level={4} className="font-mono">
				{signatureHeading(name, signature)}
			</Heading>
			{signature.params.length > 0 && (
				<Stack gap="sm">
					<Text severity="muted" className="text-sm uppercase tracking-wide">
						Parameters
					</Text>
					<div className="divide-y divide-zinc-200 dark:divide-zinc-800">
						{signature.params.map((param) => (
							<ParamRow key={param.name} param={param} />
						))}
					</div>
				</Stack>
			)}
			<Stack gap="sm">
				<Text severity="muted" className="text-sm uppercase tracking-wide">
					Returns
				</Text>
				<TypeReference
					label="Returns"
					type={signature.returns.type}
					references={signature.returns.references}
				/>
				{signature.returns.description && (
					<DocDescription description={signature.returns.description} />
				)}
			</Stack>
		</Stack>
	)
}

function ParamRow({ param }: { param: ParamApi }) {
	return (
		<Stack gap="sm" className="py-4 first:pt-0 last:pb-0">
			<span className="flex flex-wrap items-center gap-2 font-mono font-medium text-zinc-900 dark:text-white">
				<span>
					{param.name}
					{!param.optional && <span className="text-red-600 dark:text-red-500"> *</span>}
					{param.default && (
						<>
							{' '}
							<DefaultValue value={param.default} />
						</>
					)}
				</span>
				{param.optional && (
					<Badge variant="soft" size="sm">
						optional
					</Badge>
				)}
			</span>
			<TypeReference label={param.name} type={param.type} />
			{param.description && <DocDescription description={param.description} />}
		</Stack>
	)
}
