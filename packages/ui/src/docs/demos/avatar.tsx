'use client'

import { useState } from 'react'
import { Avatar, AvatarGroup } from '../../components/avatar'
import { Flex } from '../../components/flex'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'
import { capitalize } from '../components/format'
import { LabeledRow } from '../components/labeled'
import { SizeListbox } from '../components/size-listbox'
import { VariantListbox } from '../components/variant-listbox'

export const meta = { category: 'Data Display' }

const groupAvatars = ['AB', 'CD', 'EF', 'GH'] as const

const sizes = ['sm', 'md', 'lg'] as const

type Size = (typeof sizes)[number]

const variants = ['solid', 'soft', 'outline'] as const

type Variant = (typeof variants)[number]

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

export function Demo() {
	const [colorVariant, setColorVariant] = useState<Variant>('solid')
	const [groupSize, setGroupSize] = useState<Size>('md')
	const [statusSize, setStatusSize] = useState<Size>('md')

	return (
		<>
			<Example title="Variants">
				<Stack gap="sm">
					{variants.map((v) => (
						<LabeledRow key={v} label={v} labelWidth="lg">
							<Avatar variant={v} initials="A" />
						</LabeledRow>
					))}
				</Stack>
			</Example>

			<Example
				title="Colors"
				actions={
					<VariantListbox
						variants={variants}
						value={colorVariant}
						onValueChange={setColorVariant}
					/>
				}
			>
				<Flex gap="sm">
					{colors.map((color) => (
						<Avatar
							key={color}
							variant={colorVariant}
							color={color}
							initials={capitalize(color)[0]}
						/>
					))}
				</Flex>
			</Example>

			<Example
				title="Group"
				actions={<SizeListbox sizes={sizes} value={groupSize} onValueChange={setGroupSize} />}
			>
				<AvatarGroup size={groupSize} extra={3}>
					{groupAvatars.map((initials) => (
						<Avatar key={initials} initials={initials} />
					))}
				</AvatarGroup>
			</Example>

			<Example
				title="Status"
				actions={<SizeListbox sizes={sizes} value={statusSize} onValueChange={setStatusSize} />}
			>
				<Flex gap="md">
					<Avatar size={statusSize} initials="AB" status="inactive" />
					<Avatar size={statusSize} initials="CD" status="active" />
					<Avatar size={statusSize} initials="EF" status="warning" />
					<Avatar size={statusSize} initials="GH" status="error" />
				</Flex>
			</Example>
		</>
	)
}
