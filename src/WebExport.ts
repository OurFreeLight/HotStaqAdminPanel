import { AppAPI } from "./AppAPI";

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
			js: ["./assets/js/*.*"],
			components: ["./assets/components/*.js"]
		});
}

export {
        AppAPI,
		buildAssets
	};