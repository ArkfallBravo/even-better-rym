import { ImportPanel } from "./import-panel";
import { SearchPanel } from "./search-panel";

export function App() {
	return (
		<div style={{ padding: 16, fontFamily: "sans-serif", width: 480 }}>
			<ImportPanel />
			<hr style={{ margin: "24px 0" }} />
			<SearchPanel />
		</div>
	);
}
