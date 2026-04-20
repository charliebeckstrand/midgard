'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import { Fragment, useState } from 'react'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from 'ui/breadcrumb'
import { Button } from 'ui/button'
import { Collapse, CollapsePanel } from 'ui/collapse'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { Icon } from 'ui/icon'
import { Sheet, SheetActions, SheetBody, SheetTitle } from 'ui/sheet'
import { Spacer } from 'ui/spacer'
import { Stack } from 'ui/stack'

const accounts = [
	{ id: '1', name: 'Acme Inc.' },
	{ id: '2', name: 'Globex Corporation' },
	{ id: '3', name: 'Soylent Corp.' },
	{ id: '4', name: 'Initech' },
	{ id: '5', name: 'Umbrella Corporation' },
	{ id: '6', name: 'Hooli' },
	{ id: '7', name: 'Vehement Capital Partners' },
	{ id: '8', name: 'Massive Dynamic' },
	{ id: '9', name: 'Stark Industries' },
	{ id: '10', name: 'Wayne Enterprises' },
	{ id: '11', name: 'Wonka Industries' },
	{ id: '12', name: 'Gekko & Co.' },
	{ id: '13', name: 'Duff Beer' },
	{ id: '14', name: 'Prestige Worldwide' },
	{ id: '15', name: 'Cyberdyne Systems' },
	{ id: '16', name: 'Biffco Enterprises' },
	{ id: '17', name: 'Gringotts Wizarding Bank' },
	{ id: '18', name: 'Monsters, Inc.' },
	{ id: '19', name: 'Pied Piper' },
	{ id: '20', name: 'Vandelay Industries' },
]

export default function ShipmentsCreateClient() {
	const [selectAccountOpen, setSelectAccountOpen] = useState(false)

	const [openIds, setOpenIds] = useState<Set<string>>(new Set())

	const toggle = (id: string) => {
		setOpenIds((prev) => {
			const next = new Set(prev)

			if (next.has(id)) next.delete(id)
			else next.add(id)

			return next
		})
	}

	return (
		<Stack gap={6}>
			<Flex gap={2}>
				<Heading>Create Shipment</Heading>
				<Spacer />
				<Button color="blue" onClick={() => setSelectAccountOpen(true)}>
					Select account
				</Button>
			</Flex>

			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/shipments">Shipments</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink current>Create</BreadcrumbLink>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<Sheet open={selectAccountOpen} onOpenChange={setSelectAccountOpen}>
				<SheetTitle>Select account</SheetTitle>
				<SheetBody>
					<Stack gap={2}>
						{accounts.map((account) => {
							const isOpen = openIds.has(account.id)

							return (
								<Fragment key={account.id}>
									<Button onClick={() => toggle(account.id)}>
										{account.name}
										<Icon icon={isOpen ? <ChevronDown /> : <ChevronRight />} />
									</Button>
									<Collapse open={isOpen}>
										<CollapsePanel>
											<div className="py-4">test</div>
										</CollapsePanel>
									</Collapse>
								</Fragment>
							)
						})}
					</Stack>
				</SheetBody>
				<SheetActions>
					<Button onClick={() => setSelectAccountOpen(false)}>Close</Button>
					<Button color="blue" onClick={() => setSelectAccountOpen(false)}>
						Select
					</Button>
				</SheetActions>
			</Sheet>
		</Stack>
	)
}
