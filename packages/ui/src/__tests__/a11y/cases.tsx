import type { ReactElement } from 'react'
import { Alert } from '../../components/alert'
import { Badge } from '../../components/badge'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from '../../components/breadcrumb'
import { Button } from '../../components/button'
import { Checkbox, CheckboxField, CheckboxGroup } from '../../components/checkbox'
import { Field, Label } from '../../components/fieldset'
import { Heading } from '../../components/heading'
import { Input } from '../../components/input'
import { Spinner } from '../../components/spinner'
import { Switch, SwitchField } from '../../components/switch'
import { Text } from '../../components/text'
import { Textarea } from '../../components/textarea'

export type Case = readonly [name: string, element: ReactElement]

/**
 * Canonical, correctly-labelled render of each component — the single source of
 * truth shared by the axe gate (`baseline.test.tsx`) and the weighted score
 * benchmark (`score.ts`). Add new components here as their canonical render is
 * verified clean; both consumers pick them up automatically.
 */
export const baseline: readonly Case[] = [
	['badge', <Badge key="b">New</Badge>],
	['button', <Button key="b">Save</Button>],
	['spinner', <Spinner key="s" />],
	[
		'heading + text',
		<div key="h">
			<Heading level={1}>Title</Heading>
			<Text>Body copy.</Text>
		</div>,
	],
	[
		'alert',
		<Alert key="a" severity="success" title="Saved" description="Your changes are live." />,
	],
	[
		'input in field',
		<Field key="f">
			<Label htmlFor="axe-name">Name</Label>
			<Input id="axe-name" />
		</Field>,
	],
	[
		'textarea in field',
		<Field key="f">
			<Label htmlFor="axe-bio">Bio</Label>
			<Textarea id="axe-bio" />
		</Field>,
	],
	[
		'checkbox',
		<CheckboxGroup key="c">
			<CheckboxField>
				<Checkbox />
				<Label>Accept terms and conditions</Label>
			</CheckboxField>
		</CheckboxGroup>,
	],
	[
		'switch',
		<SwitchField key="s">
			<Label>Notifications</Label>
			<Switch />
		</SwitchField>,
	],
	[
		'breadcrumb',
		<Breadcrumb key="b">
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink href="#home">Home</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem>
					<BreadcrumbLink current>Current</BreadcrumbLink>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>,
	],
]
