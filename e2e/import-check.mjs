// Drives the *real* macOS Safari + the currently-enabled build of this
// extension through the release-submission "Import" form, once per
// resolvable service, and reports which ones succeed vs fail.
//
// This exists because a vitest test can't reproduce this: Node's `fetch` has
// no CORS enforcement, so it can't exercise the content-script-fetch-then-
// background-script-fetch fallback in `src/shared/utils/fetch.ts`, which is
// exactly where the Safari-specific failure lives. Only driving the actual
// Safari process (with the actual background page's network sandbox)
// reproduces it.
//
// One-time local setup:
//   1. Safari > Develop menu > Allow Remote Automation (must be checked).
//   2. Run `safaridriver --enable` once (may prompt for your password).
//   3. Build and enable the extension in Safari > Settings > Extensions,
//      same as manual testing.
//   4. Copy e2e/urls.example.json to e2e/urls.json and fill in a real,
//      known-good release URL per service, plus a submissionUrl that lands
//      on a real "add release" page showing the Import step while logged in.
//
// Run with: npm run test:e2e:safari
//
// Caveat: resolved results are cached in extension storage
// (`withCache` in src/shared/utils/cache.ts, 1 hour TTL by default). A
// cached success from before a regression will read as a false pass; a
// cached failure will read as a false fail. If you need a clean read,
// clear the extension's storage (or wait out the cache) before running.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Builder, By, until } from "selenium-webdriver";

const CONFIG_PATH = fileURLToPath(new URL("./urls.json", import.meta.url));
const EXAMPLE_PATH = fileURLToPath(
	new URL("./urls.example.json", import.meta.url),
);
const FORM_TIMEOUT_MS = 15_000;
const RESULT_TIMEOUT_MS = 20_000;

function loadConfig() {
	try {
		return JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
	} catch {
		console.error(
			`Missing ${CONFIG_PATH}.\nCopy ${EXAMPLE_PATH} to e2e/urls.json and fill in real URLs first.`,
		);
		process.exit(1);
	}
}

async function tryReadTooltip(driver, xIcon) {
	try {
		await driver.actions().move({ origin: xIcon }).perform();
		await driver.sleep(300);
		return await driver.executeScript(() => {
			const candidate = [...document.querySelectorAll("body > div")].find(
				(element) => element.style?.wordWrap === "break-word",
			);
			return candidate ? candidate.textContent : null;
		});
	} catch {
		return null;
	}
}

async function checkService(driver, submissionUrl, name, releaseUrl) {
	await driver.get(submissionUrl);

	const urlInput = await driver.wait(
		until.elementLocated(By.css('#even-better-rym input[type="url"]')),
		FORM_TIMEOUT_MS,
	);
	await urlInput.sendKeys(releaseUrl);

	// let the ServiceSelector's regex-matching effect pick the right service
	await driver.sleep(500);

	const submitButton = await driver.findElement(
		By.css('#even-better-rym input[type="submit"]'),
	);
	await submitButton.click();

	const outcomeElement = await driver.wait(
		until.elementLocated(
			By.css(
				"#even-better-rym svg.feather-x, #even-better-rym svg.feather-check",
			),
		),
		RESULT_TIMEOUT_MS,
	);
	const classAttribute = await outcomeElement.getAttribute("class");

	if (classAttribute.includes("feather-check")) {
		return { name, ok: true };
	}

	const tooltip = await tryReadTooltip(driver, outcomeElement);
	return { name, ok: false, error: tooltip ?? "(unknown error — see console)" };
}

async function main() {
	const config = loadConfig();
	const entries = Object.entries(config.releases).filter(
		([, url]) => url.length > 0,
	);

	if (entries.length === 0) {
		console.error("e2e/urls.json has no release URLs filled in.");
		process.exit(1);
	}

	const driver = await new Builder().forBrowser("safari").build();
	const results = [];

	for (const [name, releaseUrl] of entries) {
		try {
			results.push(
				await checkService(driver, config.submissionUrl, name, releaseUrl),
			);
		} catch (error) {
			results.push({ name, ok: false, error: String(error) });
		}
	}

	try {
		await driver.quit();
	} catch (error) {
		console.error(`(driver.quit() failed, ignoring: ${error})`);
	}

	console.log("\nImport check results:");
	for (const result of results) {
		console.log(
			result.ok
				? `  PASS  ${result.name}`
				: `  FAIL  ${result.name} — ${result.error}`,
		);
	}

	process.exit(results.some((result) => !result.ok) ? 1 : 0);
}

await main();
