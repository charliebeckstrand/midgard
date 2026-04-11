'use client'

import { useState } from 'react'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../components/combobox'
import { Field, Label } from '../../components/fieldset'
import { Skeleton, type SkeletonComponent, skeletonComponents } from '../../components/skeleton'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Feedback' }

function SkeletonPicker() {
	const [selected, setSelected] = useState<SkeletonComponent | undefined>('card')

	return (
		<div className="space-y-4 w-full">
			<Field className="lg:max-w-xs">
				<Label>Component</Label>
				<Combobox<SkeletonComponent>
					value={selected}
					onChange={setSelected}
					displayValue={(v) => v}
					placeholder="Search components"
				>
					{(query) =>
						skeletonComponents
							.filter((c) => !query || c.toLowerCase().includes(query.toLowerCase()))
							.map((c) => (
								<ComboboxOption key={c} value={c}>
									<ComboboxLabel>{c}</ComboboxLabel>
								</ComboboxOption>
							))
					}
				</Combobox>
			</Field>
			<div className="flex items-center rounded-lg border border-dashed border-zinc-300 p-8 dark:border-zinc-700">
				{selected ? (
					<div className="w-full max-w-xl">
						<Skeleton component={selected} />
					</div>
				) : (
					<p className="text-sm text-zinc-500">Pick a component to preview its skeleton.</p>
				)}
			</div>
		</div>
	)
}

export default function SkeletonDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Pick a component"
				code={code`
					import { Combobox, ComboboxLabel, ComboboxOption } from 'ui/combobox'
					import { Field, Label } from 'ui/fieldset'
					import { Skeleton, skeletonComponents, type SkeletonComponent } from 'ui/skeleton'

					const [selected, setSelected] = useState<SkeletonComponent | undefined>('card')

					<Field>
						<Label>Component</Label>
						<Combobox<SkeletonComponent>
							value={selected}
							onChange={setSelected}
							displayValue={(v) => v}
							placeholder="Search components…"
						>
							{(query) =>
								skeletonComponents
									.filter((c) => !query || c.toLowerCase().includes(query.toLowerCase()))
									.map((c) => (
										<ComboboxOption key={c} value={c}>
											<ComboboxLabel>{c}</ComboboxLabel>
										</ComboboxOption>
									))
							}
						</Combobox>
					</Field>

					{selected && <Skeleton component={selected} />}
				`}
			>
				<SkeletonPicker />
			</Example>

			<Example
				title="Direct usage"
				code={code`
					import { Skeleton } from 'ui/skeleton'

					<Skeleton component="button" />
					<Skeleton component="avatar" />
					<Skeleton component="badge" />
				`}
			>
				<div className="flex flex-wrap items-start gap-8">
					{/* <Skeleton component="card" /> */}
					<div className="space-y-4">
						<Skeleton component="button" />
						<Skeleton component="avatar" />
						<Skeleton component="badge" />
					</div>
				</div>
			</Example>
		</div>
	)
}
