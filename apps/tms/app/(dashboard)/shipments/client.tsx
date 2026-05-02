'use client'

import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { Spacer } from 'ui/spacer'

export default function ShipmentsClient() {
	return (
		<Flex gap="sm">
			<Heading>Shipments</Heading>
			<Spacer />
			<Button color="green" href="/shipments/create">
				Create Shipment
			</Button>
		</Flex>
	)
}
