import { useEffect, useRef, useState } from "preact/hooks";

import {
	comboFromEvent,
	hasRequiredModifier,
	isMacPlatform,
	isModifierOnlyCode,
} from "~/shared/chart-shortcuts/binding";

import { styles } from "./styles";

const NEEDS_MODIFIER_MESSAGE = `Shortcuts need ${isMacPlatform ? "Control" : "Ctrl"}, ${isMacPlatform ? "Option" : "Alt"}, or Command`;

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
		<>
			<input
				ref={inputRef}
				readOnly
				value="Press keys… (Esc to cancel)"
				style={styles.recorderInput}
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
			{error && <div style={styles.comboError}>{error}</div>}
		</>
	);
}
