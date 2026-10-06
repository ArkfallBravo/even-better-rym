// ----------------------------------------------------------------------- //
//
// MODULE  : picker-row.tsx
//
// PURPOSE : Row and button markup shared by the artist pickers
//
// CREATED : 10/6/2026
//
// ----------------------------------------------------------------------- //

import type { ComponentChildren } from "preact";

type PickerRowProps = {
	name: string;
	status: string;
	active: boolean;
	children: ComponentChildren;
};

// Renders one artist's row: its name, status and controls.
export function PickerRow({
	name,
	status,
	active,
	children,
}: Readonly<PickerRowProps>) {
	return (
		<div style={{ fontWeight: active ? 700 : "normal" }}>
			{name}: {status} {children}
		</div>
	);
}

type PickerButtonProps = {
	value: string;
	onClick: () => void;
};

// Renders a small RYM-styled button.
export function PickerButton({ value, onClick }: Readonly<PickerButtonProps>) {
	return (
		<input
			type="button"
			className="btn btn_small"
			value={value}
			onClick={onClick}
		/>
	);
}
