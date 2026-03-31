import {
	PanelActions,
	type PanelActionsProps,
	PanelBody,
	type PanelBodyProps,
	PanelDescription,
	type PanelDescriptionProps,
	PanelTitle,
	type PanelTitleProps,
} from '../../primitives'

export type DialogTitleProps = PanelTitleProps
export type DialogDescriptionProps = PanelDescriptionProps
export type DialogBodyProps = PanelBodyProps
export type DialogActionsProps = PanelActionsProps

export function DialogTitle(props: DialogTitleProps) {
	return <PanelTitle slot="dialog-title" {...props} />
}

export function DialogDescription(props: DialogDescriptionProps) {
	return <PanelDescription slot="dialog-description" {...props} />
}

export function DialogBody(props: DialogBodyProps) {
	return <PanelBody slot="dialog-body" {...props} />
}

export function DialogActions(props: DialogActionsProps) {
	return <PanelActions slot="dialog-actions" {...props} />
}
