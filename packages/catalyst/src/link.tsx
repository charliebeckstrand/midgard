import NextLink from 'next/link'
import type React from 'react'

export function Link(props: React.ComponentPropsWithoutRef<typeof NextLink>) {
	return <NextLink {...props} />
}
