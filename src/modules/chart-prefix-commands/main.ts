import { runPage } from "~/shared/page-settings";

import { main } from "./app";

await runPage("chartPrefixCommands", async () => {
	await main();
});
