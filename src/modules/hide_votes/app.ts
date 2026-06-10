import { waitForDocumentReady } from "~/shared/utils/dom";

const STYLE = `
	.ebr-hide-votes-button {
		margin-left: 8px;
		cursor: pointer;
		font-size: 0.8em;
		color: #666;
		user-select: none;
}
	.ebr-hide-votes-button:hover {
		color: #333;
	}
	.ebr-votes-hidden .ebr-user-list {
		display: none !important;
	}
	.ebr-user-count {
		display: none;
		color: #666;
		font-size: 0.9em;
	}
	.ebr-votes-hidden .ebr-user-count {
		display: inline;
	}
`;

const VOTE_HEADER_PATTERN =
	/(<b>voted (?:for|against):<\/b>.*?:)/i;

function extractVoteCount(html: string): number {
	// Match the number after "voted for:" or "voted against:" and before the parenthesis
	// For descriptor pages: "(321 / <span..." or "(7):"
	// For genre pages: "(22) :"
	const match = html.match(/<b>voted (?:for|against):<\/b>\s*\((\d+)/);
	return match ? parseInt(match[1], 10) : 0;
}

function addHideButton(spanElement: HTMLElement, voteForCount: number, voteAgainstCount: number): void {
	if (spanElement.querySelector(".ebr-hide-votes-button")) return;

	const html = spanElement.innerHTML;
	const match = html.match(VOTE_HEADER_PATTERN);

	let before: string;
	let userListHtml: string;

	if (match && match.index !== undefined) {
		// Standard case: has vote header like "voted for: (XXX) :"
		const insertPosition = match.index + match[0].length;
		before = html.substring(0, insertPosition);
		userListHtml = html.substring(insertPosition);
	} else {
		// Genre page case: empty <b> tag, insert at beginning
		before = "";
		userListHtml = html;
	}

	// Calculate percentage
	const totalVotes = voteForCount + voteAgainstCount;
	const isVoteFor = html.includes("voted for:");
	const currentCount = isVoteFor ? voteForCount : voteAgainstCount;
	const percentage = totalVotes > 0 ? ((currentCount / totalVotes) * 100).toFixed(1) : "0.0";

	// Insert percentage after the vote count in the header
	// For descriptor pages with score section, append percentage after the colon
	// For genre pages without score section, replace the vote count with percentage
	const hasScoreSection = html.includes('title="unweighted degree average"');
	let updatedBefore: string;

	if (hasScoreSection) {
		// Descriptor page: append percentage after the colon
		updatedBefore = before + ` ${currentCount}/${totalVotes}, ${percentage}%`;
	} else {
		// Genre page: replace the vote count with percentage
		updatedBefore = before.replace(/\((\d+)\)/, `($1/${totalVotes}, ${percentage}%)`);
	}

	spanElement.innerHTML =
		updatedBefore +
		`<span class="ebr-hide-votes-button" style="cursor: pointer;">Hide</span>` +
		`<span class="ebr-user-list">${userListHtml}</span>` +
		`<span class="ebr-user-count"></span>`;

	const button = spanElement.querySelector<HTMLElement>(".ebr-hide-votes-button");
	if (!button) return;

	button.addEventListener("click", () => {
		spanElement.classList.toggle("ebr-votes-hidden");
		if (spanElement.classList.contains("ebr-votes-hidden")) {
			button.textContent = "Show";
			const users = spanElement.querySelectorAll("a.user, span.userd");
		} else {
			button.textContent = "Hide";
		}
	});
}

function processVoteSpans(): void {
	const spans = document.querySelectorAll("span.small");

	// Group spans by their container (genrea or descriptora)
	const containerMap = new Map<HTMLElement, HTMLElement[]>();

	for (const span of spans) {
		const bold = span.querySelector("b");
		if (!bold) continue;

		const text = bold.textContent?.trim().toLowerCase();
		const hasUserLinks = span.querySelector("a.user");

		// Only process spans with vote text or user links
		if (text && (text.startsWith("voted for:") || text.startsWith("voted against:"))) {
			const container = span.closest(".genrea, .genred, .descriptora, .descriptord") as HTMLElement;
			if (container) {
				if (!containerMap.has(container)) {
					containerMap.set(container, []);
				}
				containerMap.get(container)!.push(span as HTMLElement);
			}
		} else if (!text && hasUserLinks) {
			// Genre page case with empty <b> tag
			const container = span.closest(".genrea") as HTMLElement;
			if (container) {
				if (!containerMap.has(container)) {
					containerMap.set(container, []);
				}
				containerMap.get(container)!.push(span as HTMLElement);
			}
		}
	}

	// Process each container's spans
	for (const [container, containerSpans] of containerMap) {
		let voteForCount = 0;
		let voteAgainstCount = 0;

		// Extract vote counts from spans
		for (const span of containerSpans) {
			const html = span.innerHTML;
			const count = extractVoteCount(html);
			if (html.includes("voted for:")) {
				voteForCount = count;
			} else if (html.includes("voted against:")) {
				voteAgainstCount = count;
			}
		}

		// Add buttons with vote counts
		for (const span of containerSpans) {
			addHideButton(span, voteForCount, voteAgainstCount);
		}
	}
}

function addSwitchLink(): void {
	const url = window.location.href;
	const isGenrePage = url.includes("/rgenre/");
	const isDescriptorPage = url.includes("/rdescriptor/");

	if (!isGenrePage && !isDescriptorPage) return;

	// Extract album_id from URL
	const albumIdMatch = url.match(/album_id=(\d+)/);
	if (!albumIdMatch) return;
	const albumId = albumIdMatch[1];

	if (isGenrePage) {
		// Find "Primary Genres" h3 and add "Switch to Descriptor" link
		const h3 = document.querySelector("h3");
		if (h3 && h3.textContent?.includes("Primary Genres")) {
			const link = document.createElement("a");
			link.textContent = "Switch to Descriptor";
			link.href = url.replace("/rgenre/", "/rdescriptor/");
			link.style.marginLeft = "10px";
			link.style.fontSize = "0.8em";
			link.style.color = "#666";
			link.style.cursor = "pointer";
			h3.appendChild(link);
		}
	} else if (isDescriptorPage) {
		// Find "Descriptors" h3 and add "Switch to Genres" link
		const h3s = document.querySelectorAll("h3");
		for (const h3 of h3s) {
			if (h3.textContent?.includes("Descriptors")) {
				const link = document.createElement("a");
				link.textContent = "Switch to Genres";
				link.href = url.replace("/rdescriptor/", "/rgenre/");
				link.style.marginLeft = "10px";
				link.style.fontSize = "0.8em";
				link.style.color = "#666";
				link.style.cursor = "pointer";
				h3.appendChild(link);
				break;
			}
		}
	}
}

function addCollapseAllButton(): void {
	const url = window.location.href;
	const isGenrePage = url.includes("/rgenre/");
	const isDescriptorPage = url.includes("/rdescriptor/");

	if (!isGenrePage && !isDescriptorPage) return;

	// Find the form element in the votingbox table
	const form = document.querySelector(".votingbox form");
	if (!form) return;

	const collapseButton = document.createElement("input");
	collapseButton.type = "button";
	collapseButton.value = "Collapse All";
	collapseButton.style.marginLeft = "0.5em";

	let allCollapsed = false;
	collapseButton.addEventListener("click", () => {
		const buttons = document.querySelectorAll(".ebr-hide-votes-button");
		allCollapsed = !allCollapsed;

		buttons.forEach((button) => {
			const span = button.closest("span.small") as HTMLElement;
			if (span) {
				if (allCollapsed) {
					span.classList.add("ebr-votes-hidden");
					(button as HTMLElement).textContent = "Show";
				} else {
					span.classList.remove("ebr-votes-hidden");
					(button as HTMLElement).textContent = "Hide";
				}
			}
		});

		(collapseButton as HTMLInputElement).value = allCollapsed ? "Expand All" : "Collapse All";
	});

	form.appendChild(collapseButton);
}

export async function main(): Promise<void> {
	await waitForDocumentReady();

	const style = document.createElement("style");
	style.textContent = STYLE;
	document.head.appendChild(style);

	const url = window.location.href;
	const isGenrePage = url.includes("/rgenre/");
	const isDescriptorPage = url.includes("/rdescriptor/");

	// Wait different amounts for dynamic content to load based on page type
	const delay = isDescriptorPage ? 2500 : 3500;

	setTimeout(() => {
		processVoteSpans();
		addSwitchLink();
		addCollapseAllButton();
	}, delay);
}
