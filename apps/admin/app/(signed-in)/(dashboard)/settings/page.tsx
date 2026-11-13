import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
	return <PageHeader title="Settings" description="The admin app has no settings yet." />
}
