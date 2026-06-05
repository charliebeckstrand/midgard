import type { ReactElement } from 'react'
import { describe, it } from 'vitest'
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
import { Icon } from '../../components/icon'
import { Input } from '../../components/input'
import { Spinner } from '../../components/spinner'
import { Switch, SwitchField } from '../../components/switch'
import { Text } from '../../components/text'
import { Textarea } from '../../components/textarea'
import { axe, renderUI } from '../helpers'

/**
 * Automated WCAG smoke test (axe-core). This is a regression guard, not a
 * substitute for a manual sweep: axe catches static role/name/ARIA/label/
 * structure defects but cannot see keyboard behavior, focus management, live
 * regions, contrast, or touch-target geometry. Rules it can't evaluate in jsdom
 * (color-contrast, target-size, region) are disabled in helpers/axe.ts.
 *
 * Each component is rendered in its canonical, correctly-labelled form; add new
 * components here as their canonical render is verified clean.
 */

type Case = readonly [name: string, element: ReactElement]

const baseline: readonly Case[] = [
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

describe('a11y baseline (axe)', () => {
	it.each(baseline)('%s has no axe violations', async (_name, element) => {
		const { container } = renderUI(element)

		expect(await axe(container)).toHaveNoViolations()
	})
})

// Proves the gate has teeth: axe must actually surface a real defect, so a
// passing baseline above means "clean", not "matcher misconfigured". This case
// is a known finding from the audit (icon-only controls need an accessible
// name, WCAG 4.1.2) — the Button below intentionally omits aria-label.
describe('a11y baseline (axe) — teeth check', () => {
	it('detects an icon-only button with no accessible name', async () => {
		const { container } = renderUI(
			<Button>
				<Icon icon={<svg />} />
			</Button>,
		)

		const { violations } = await axe(container)

		expect(violations.map((violation) => violation.id)).toContain('button-name')
	})
})
