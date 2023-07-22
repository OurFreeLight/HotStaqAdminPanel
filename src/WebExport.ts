async function buildAssets (): Promise<any>
{
	return ({
			import: ["@popperjs/core", 
				{ name: "jquery", files: ["jquery.min.js"] }, 
				"chart.js", 
				"feather-icons", 
				{ name: "bootstrap", files: ["bootstrap.min.js", "bootstrap.min.css"] }],
			html: ["./assets/html/*.*"],
			css: ["./assets/css/*.*"],
			js: ["./assets/js/*.*", "./build-web/AdminPanelComponents.js"],
			componentLibrary: "AdminPanelComponentsWeb",
			components: [
				"AdminDashboard",
				"AdminEdit",
				"AdminButton",
				"AdminDropdown",
				"AdminTable",
				"AdminTableField",
				"AdminTableRow",
				"AdminText"]
		});
}

export {
	buildAssets
};