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
import { FileUpload } from '../../components/file-upload'
import { Heading } from '../../components/heading'
import { Input } from '../../components/input'
import {
	Pagination,
	PaginationList,
	PaginationNext,
	PaginationPage,
	PaginationPrevious,
} from '../../components/pagination'
import { Slider } from '../../components/slider'
import { Spinner } from '../../components/spinner'
import { Switch, SwitchField } from '../../components/switch'
import { Text } from '../../components/text'
import { Textarea } from '../../components/textarea'

export type Case = readonly [name: string, element: ReactElement]

/**
 * Canonical, correctly-wired render of each component — the corpus the
 * compliance gate (`baseline.test.tsx`) asserts is axe-clean. This is where
 * "all components are a11y-compliant" is enforced: add every component here in
 * its canonical, correctly-labelled form as it is verified clean.
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
		// No explicit id: the Field generates one, the Label and Slider both read
		// it from Control context, so the label names the range input.
		'slider in field',
		<Field key="f">
			<Label>Volume</Label>
			<Slider defaultValue={50} />
		</Field>,
	],
	['file upload (area)', <FileUpload key="fu" variant="area" />],
	['file upload (button)', <FileUpload key="fu" variant="button" />],
	[
		// Previous/Next sit outside the <ol>, so they must not be list items.
		'pagination',
		<Pagination key="p">
			<PaginationPrevious />
			<PaginationList>
				<PaginationPage current>1</PaginationPage>
				<PaginationPage>2</PaginationPage>
			</PaginationList>
			<PaginationNext />
		</Pagination>,
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
