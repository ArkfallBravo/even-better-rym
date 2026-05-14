import { useEffect, useRef, useState } from "preact/hooks";

import type { BrowseResult } from "./browse-api";
import { browseSearch, matchesType, resultName } from "./browse-api";
import type { FilterType } from "./apply";

export type Pill =
	| { kind: "confirmed"; path: string; name: string }
	| { kind: "pending"; text: string };

export type FieldRef = {
	getPills: () => Pill[];
	getRawText: () => string;
	clear: () => void;
};

type Props = {
	filterType: FilterType;
	scope: "genre" | "descriptor";
	label: string;
	registerRef: (ref: FieldRef) => void;
};

const STYLE_ID = "ebr-chart-filter-textfields-style";

const ensureStyle = () => {
	if (document.getElementById(STYLE_ID)) return;
	const style = document.createElement("style");
	style.id = STYLE_ID;
	style.textContent = `
		.ebr-cft-panel { margin-top: .8em; padding: .8em; background: var(--mono-f8, transparent); border-radius: 3px; }
		.ebr-cft-wrapper { margin-top: .6em; position: relative; }
		.ebr-cft-wrapper:first-child { margin-top: 0; }
		.ebr-cft-label { font-weight: bold; margin-bottom: .25em; color: var(--text-primary, inherit); font-size: .95em; }
		.ebr-cft-input {
			width: 100%;
			padding: .4em .6em;
			border-radius: 3px;
			border: 1px solid var(--mono-c, #ccc);
			background: var(--surface-primary, #fff);
			color: var(--text-primary, #000);
			font-size: 1em;
			box-sizing: border-box;
			outline: none;
		}
		.ebr-cft-input:focus { border-color: var(--primary, #207bbf); }
		.ebr-cft-dropdown {
			position: absolute;
			z-index: 10;
			top: 100%;
			left: 0;
			right: 0;
			max-height: 12em;
			overflow-y: auto;
			background: var(--surface-primary, #fff);
			border: 1px solid var(--mono-c, #ccc);
			border-radius: 3px;
			margin-top: .2em;
			box-shadow: 1px 1px 3px rgba(0,0,0,.2);
		}
		.ebr-cft-dropdown-item {
			padding: .4em .6em;
			cursor: pointer;
			color: var(--text-primary, #000);
		}
		.ebr-cft-dropdown-item:hover, .ebr-cft-dropdown-item.active {
			background: var(--surface-secondary, #f0f0f0);
		}
		.ebr-cft-pills { display: flex; flex-wrap: wrap; gap: .3em; margin-top: .3em; }
		.ebr-cft-pill {
			display: inline-flex;
			align-items: center;
			gap: .3em;
			padding: .2em .5em;
			border-radius: 3px;
			font-size: .85em;
			line-height: 1.4;
		}
		.ebr-cft-pill-confirmed {
			background: var(--primary, #207bbf);
			color: white;
		}
		.ebr-cft-pill-pending {
			background: transparent;
			color: var(--text-primary, #000);
			border: 1px dashed var(--mono-8, #888);
		}
		.ebr-cft-pill-remove {
			cursor: pointer;
			opacity: .8;
			font-weight: bold;
		}
		.ebr-cft-pill-remove:hover { opacity: 1; }
	`;
	document.head.append(style);
};

export function ChartFilterField({
	filterType,
	scope,
	label,
	registerRef,
}: Props) {
	const [text, setText] = useState("");
	const [pills, setPills] = useState<Pill[]>([]);
	const [suggestions, setSuggestions] = useState<BrowseResult[]>([]);
	const [open, setOpen] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>();

	useEffect(() => {
		ensureStyle();
	}, []);

	useEffect(() => {
		registerRef({
			getPills: () => pills,
			getRawText: () => text,
			clear: () => {
				setPills([]);
				setText("");
			},
		});
	}, [pills, text, registerRef]);

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		const q = text.trim();
		if (q.length === 0) {
			setSuggestions([]);
			return;
		}
		debounceRef.current = setTimeout(() => {
			void browseSearch(q)
				.then((response) => {
					const filtered = response.results
						.filter((r) => matchesType(r, scope))
						.slice(0, 8);
					setSuggestions(filtered);
				})
				.catch(() => setSuggestions([]));
		}, 200);
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [text, scope]);

	const addConfirmed = (r: BrowseResult) => {
		const name = resultName(r);
		const path = (r.path as string | undefined) ?? "";
		if (!name || !path) return;
		setPills((prev) => {
			if (prev.some((p) => p.kind === "confirmed" && p.path === path)) {
				return prev;
			}
			return [...prev, { kind: "confirmed", path, name }];
		});
		setText("");
		setSuggestions([]);
		setOpen(false);
	};

	const removePill = (index: number) => {
		setPills((prev) => prev.filter((_, i) => i !== index));
	};

	return (
		<div
			className="ebr-cft-wrapper"
			data-filter-type={filterType}
			onFocusIn={() => setOpen(true)}
		>
			<div className="ebr-cft-label">{label}</div>
			<input
				className="ebr-cft-input"
				value={text}
				placeholder="Type to add — separate multiple with commas or spaces"
				onInput={(event) => {
					setText((event.target as HTMLInputElement).value);
					setOpen(true);
				}}
				onFocus={() => setOpen(true)}
				onBlur={() => setTimeout(() => setOpen(false), 150)}
				onKeyDown={(event) => {
					if (event.key === "Enter" && suggestions.length > 0) {
						event.preventDefault();
						addConfirmed(suggestions[0]!);
					}
				}}
			/>
			{open && suggestions.length > 0 && (
				<div className="ebr-cft-dropdown">
					{suggestions.map((r) => (
						<div
							key={(r.path as string) ?? resultName(r)}
							className="ebr-cft-dropdown-item"
							onMouseDown={(event) => {
								event.preventDefault();
								addConfirmed(r);
							}}
						>
							{resultName(r)}
						</div>
					))}
				</div>
			)}
			{pills.length > 0 && (
				<div className="ebr-cft-pills">
					{pills.map((pill, idx) => (
						<span
							key={pill.kind === "confirmed" ? pill.path : `pending-${idx}`}
							className={`ebr-cft-pill ${
								pill.kind === "confirmed"
									? "ebr-cft-pill-confirmed"
									: "ebr-cft-pill-pending"
							}`}
						>
							{pill.kind === "confirmed" ? pill.name : pill.text}
							<span
								className="ebr-cft-pill-remove"
								onClick={() => removePill(idx)}
							>
								×
							</span>
						</span>
					))}
				</div>
			)}
		</div>
	);
}
