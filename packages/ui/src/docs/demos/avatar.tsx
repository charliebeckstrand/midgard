'use client'

import { useState } from 'react'
import { Avatar, AvatarGroup } from '../../components/avatar'
import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Data Display' }

const groupAvatars = ['AB', 'CD', 'EF', 'GH'] as const

const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const
const variants = ['solid', 'soft', 'outline'] as const
const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

type Size = (typeof sizes)[number]
type Variant = (typeof variants)[number]

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function AvatarDemo() {
	const [colorVariant, setColorVariant] = useState<Variant>('solid')
	const [groupSize, setGroupSize] = useState<Size>('sm')
	const [statusSize, setStatusSize] = useState<Size>('sm')

	return (
		<div className="space-y-8">
			<Example
				title="Variants"
				code={code`
					import { Avatar } from 'ui/avatar'

					${variants.map((v) => `<Avatar variant="${v}" initials="A" />`)}
				`}
			>
				<div className="flex items-center gap-2">
					{variants.map((v) => (
						<Avatar key={v} variant={v} initials="A" />
					))}
				</div>
			</Example>
			<Example
				title="Colors"
				actions={
					<Listbox
						value={colorVariant}
						onChange={setColorVariant}
						className="min-w-28"
						displayValue={(v: string) => cap(v)}
					>
						{variants.map((v) => (
							<ListboxOption key={v} value={v}>
								<ListboxLabel>{cap(v)}</ListboxLabel>
							</ListboxOption>
						))}
					</Listbox>
				}
				code={code`
					import { Avatar } from 'ui/avatar'

					${colors.map((c) => `<Avatar variant="${colorVariant}" color="${c}" initials="${cap(c)[0]}" />`)}
				`}
			>
				<div className="flex items-center gap-2">
					{colors.map((color) => (
						<Avatar key={color} variant={colorVariant} color={color} initials={cap(color)[0]} />
					))}
				</div>
			</Example>
			<Example
				title="Group"
				actions={
					<Listbox
						value={groupSize}
						onChange={setGroupSize}
						className="min-w-20"
						displayValue={(v: string) => v}
					>
						{sizes.map((s) => (
							<ListboxOption key={s} value={s}>
								<ListboxLabel>{s}</ListboxLabel>
							</ListboxOption>
						))}
					</Listbox>
				}
				code={code`
					import { Avatar, AvatarGroup } from 'ui/avatar'

					<AvatarGroup size="${groupSize}" extra={3}>
						${groupAvatars.map((i) => `<Avatar initials="${i}" />`)}
					</AvatarGroup>
				`}
			>
				<AvatarGroup size={groupSize} extra={3}>
					{groupAvatars.map((initials) => (
						<Avatar key={initials} initials={initials} />
					))}
				</AvatarGroup>
			</Example>
			<Example
				title="Status"
				actions={
					<Listbox
						value={statusSize}
						onChange={setStatusSize}
						className="min-w-20"
						displayValue={(v: string) => v}
					>
						{sizes.map((s) => (
							<ListboxOption key={s} value={s}>
								<ListboxLabel>{s}</ListboxLabel>
							</ListboxOption>
						))}
					</Listbox>
				}
				code={code`
					import { Avatar } from 'ui/avatar'

					<Avatar size="${statusSize}" initials="AB" status="inactive" />
					<Avatar size="${statusSize}" initials="CD" status="active" />
					<Avatar size="${statusSize}" initials="EF" status="warning" />
					<Avatar size="${statusSize}" initials="GH" status="error" />
				`}
			>
				<div className="flex items-center gap-3">
					<Avatar size={statusSize} initials="AB" status="inactive" />
					<Avatar size={statusSize} initials="CD" status="active" />
					<Avatar size={statusSize} initials="EF" status="warning" />
					<Avatar size={statusSize} initials="GH" status="error" />
				</div>
			</Example>
		</div>
	)
}
