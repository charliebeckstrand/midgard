import { defineMessage, defineMessages } from '../../primitives/intl/intl-messages'
import type { TypedMessageDescriptor } from '../../primitives/intl/types'

/**
 * The messages of the controls of the events tool. The lines of the events
 * and the bug report stay in English, because they are developer data.
 *
 * @internal
 */
export const eventsMessages = defineMessages({
	events: {
		id: 'ui.events.events',
		defaultMessage: 'Events',
		description:
			'The name of the debug tool that lists the events of the page, of its button, and of its list.',
	},
	bugs: {
		id: 'ui.events.bugs',
		defaultMessage: 'Bugs',
		description: 'The name of the list of the bug reports that the debug tool captured.',
	},
	view: {
		id: 'ui.events.view',
		defaultMessage: 'View',
		description:
			'The name of the control that switches the debug tool between its events and its bugs.',
	},
	viewReport: {
		id: 'ui.events.viewReport',
		defaultMessage: 'View',
		description: 'The name of the button that opens one bug report of the debug tool.',
	},
	delete: {
		id: 'ui.events.delete',
		defaultMessage: 'Delete',
		description: 'The button that deletes one bug report of the debug tool.',
	},
	copy: {
		id: 'ui.events.copy',
		defaultMessage: 'Copy',
		description:
			'The button that copies the events, or one bug report as Markdown, of the debug tool.',
	},
	copied: {
		id: 'ui.events.copied',
		defaultMessage: 'Copied',
		description: 'The label of the copy button of the debug tool after a copy succeeds.',
	},
	pin: {
		id: 'ui.events.pin',
		defaultMessage: 'Pin',
		description: 'The button that docks the debug tool as a panel at the side of the page.',
	},
	unpin: {
		id: 'ui.events.unpin',
		defaultMessage: 'Unpin',
		description: 'The button that takes the docked debug tool off the side of the page.',
	},
	debug: {
		id: 'ui.events.debug',
		defaultMessage: 'Debug',
		description: 'The label of the switch that turns the debug tool on or off.',
	},
	capture: {
		id: 'ui.events.capture',
		defaultMessage: 'Capture',
		description: 'The button that starts to record the events for a bug report.',
	},
	stopCapture: {
		id: 'ui.events.stopCapture',
		defaultMessage: 'Stop capture',
		description: 'The button that stops the record and makes a bug report from it.',
	},
	preserve: {
		id: 'ui.events.preserve',
		defaultMessage: 'Preserve',
		description: 'The label of the checkbox that keeps the events through a reload of the page.',
	},
	batch: {
		id: 'ui.events.batch',
		defaultMessage: 'Batch',
		description: 'The label of the checkbox that groups repeated events in one line.',
	},
	noBugs: {
		id: 'ui.events.noBugs',
		defaultMessage: 'No bugs',
		description: 'The text of the list of bug reports when it holds none.',
	},
	noEvents: {
		id: 'ui.events.noEvents',
		defaultMessage: 'No events',
		description: 'The text of the list of events when it holds none.',
	},
	details: {
		id: 'ui.events.details',
		defaultMessage: 'Details',
		description: 'The name of the tree that shows the data of one event.',
	},
	trail: {
		id: 'ui.events.trail',
		defaultMessage: 'Breadcrumb',
		description:
			'The name of the trail of links above an open bug report, which leads back to the list of bugs.',
	},
})

/**
 * The tab of the bug reports when the list holds some, such as "Bugs 3". It
 * takes the `count` of the reports.
 *
 * @internal
 */
export const bugsCountMessage: TypedMessageDescriptor<{ count: number }> = defineMessage<{
	count: number
}>({
	id: 'ui.events.bugsCount',
	defaultMessage: 'Bugs {count, number}',
	description: 'The tab of the bug reports of the debug tool, with their count, such as "Bugs 3".',
})
