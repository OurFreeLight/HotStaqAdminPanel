import { AdminButton } from "./components/admin-button";
import { AdminDashboard } from "./components/admin-dashboard";
import { AdminEdit } from "./components/admin-edit";
import { AdminTable } from "./components/admin-table";
import { AdminTableField } from "./components/admin-table-field";
import { AdminTableRow } from "./components/admin-table-row";
import { AdminText } from "./components/admin-text";

async function buildAssets (): Promise<any>
{
	return ({
			import: [{ name: "bootstrap", files: ["bootstrap.min.js", "bootstrap.min.css"] }, 
				{ name: "jquery", files: ["jquery.min.js"] }, 
				"chart.js", 
				"feather-icons", 
				"@popperjs/core"],
			html: ["./assets/html/*.*"],
			css: ["./assets/css/*.*"],
			js: ["./assets/js/*.*", "./build-web/AdminPanelComponents.js"],
			componentLibrary: "AdminPanelComponentsWeb",
			components: [
				AdminButton,
				AdminDashboard,
				AdminEdit,
				AdminTable,
				AdminTableField,
				AdminTableRow,
				AdminText]
		});
}

export {
		buildAssets,
		AdminButton,
		AdminDashboard,
		AdminEdit,
		AdminTable,
		AdminTableField,
		AdminTableRow,
		AdminText
	};