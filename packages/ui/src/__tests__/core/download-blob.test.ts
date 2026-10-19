import { describe, expect, vi } from 'vitest'
import { downloadBlob } from '../../core/download-blob'
import { it, onFakeClock } from '../helpers/fake-clock'

describe('downloadBlob', () => {
	// Each download queues its revoke on a timer, so no revoke reaches the next test.
	onFakeClock()

	it('clicks an anchor in the document that names the file and points at the blob', () => {
		vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:file')

		vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

		const clicked: { href: string; download: string; connected: boolean }[] = []

		vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
			this: HTMLAnchorElement,
		) {
			clicked.push({ href: this.href, download: this.download, connected: this.isConnected })
		})

		downloadBlob(new Blob(['{}']), 'account.json')

		expect(clicked).toEqual([{ href: 'blob:file', download: 'account.json', connected: true }])

		expect(document.querySelector('a[download]')).toBeNull()
	})

	// A revoke in the tick of the click can cancel the download in Firefox and Safari.
	it('revokes the object URL only after the tick of the click', async ({ clock }) => {
		vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:file')

		const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

		vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

		downloadBlob(new Blob(['{}']), 'account.json')

		expect(revoke).not.toHaveBeenCalled()

		await clock.runAll()

		expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:file')
	})
})
