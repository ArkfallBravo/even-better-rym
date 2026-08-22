import type { CSSProperties } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

import {
	comboFromEvent,
	hasRequiredModifier,
	isModifierOnlyCode,
} from "~/shared/chart-shortcuts/binding";

const NEEDS_MODIFIER_MESSAGE = "Shortcuts need Ctrl, Alt, or Cmd";

type ShortcutRecorderProps = Readonly<{
	// Returns an error message to display, or null once the combo is saved.
	onCapture: (combo: string) => string | null;
}>;

export function ShortcutRecorder({ onCapture }: ShortcutRecorderProps) {
	const [recording, setRecording] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const startRecording = () => {
		setError(null);
		setRecording(true);
	};

	// Focusing imperatively (rather than the autoFocus prop, which biome's
	// a11y rule flags) - this field only appears after a direct click on the
	// "+" button, so the focus jump is user-initiated, not a surprise.
	useEffect(() => {
		if (recording) inputRef.current?.focus();
	}, [recording]);

	if (!recording) {
		return (
			<button type="button" onClick={startRecording} style={styles.addButton}>
				+
			</button>
		);
	}

	return (
		<span style={styles.recorderWrap}>
			<input
				ref={inputRef}
				readOnly
				value={error ?? "Press keys… (Esc to cancel)"}
				style={{ ...styles.recorderInput, color: error ? "#c0392b" : "#666" }}
				onBlur={() => setRecording(false)}
				onKeyDown={(event) => {
					event.preventDefault();
					event.stopPropagation();

					if (event.key === "Escape") {
						setRecording(false);
						return;
					}
					if (isModifierOnlyCode(event.code)) return;

					const combo = comboFromEvent(event);
					if (!hasRequiredModifier(combo)) {
						setError(NEEDS_MODIFIER_MESSAGE);
						return;
					}

					const captureError = onCapture(combo);
					if (captureError) {
						setError(captureError);
						return;
					}

					setRecording(false);
					setError(null);
				}}
			/>
		</span>
	);
}

const styles = {
	addButton: {
		width: 22,
		height: 22,
		borderRadius: 4,
		border: "1px solid #d0d0d0",
		background: "#fff",
		cursor: "pointer",
		fontSize: 13,
		lineHeight: 1,
		color: "#4286c4",
	} satisfies CSSProperties,

	recorderWrap: {
		display: "inline-block",
	} satisfies CSSProperties,

	recorderInput: {
		width: 170,
		fontSize: 11,
		padding: "3px 6px",
		border: "1px solid #4286c4",
		borderRadius: 4,
		outline: "none",
		background: "#fff",
	} satisfies CSSProperties,
};
