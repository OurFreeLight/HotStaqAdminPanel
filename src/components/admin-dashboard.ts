import { HotStaq, Hot, HotAPI, HotComponent } from "hotstaq";

export class AdminDashboard extends HotComponent
{
	/**
	 * The title of this dashboard.
	 */
	title: string;
	/**
	 * The base url to use for this dashboard.
	 */
	base: string;

	constructor (copy: HotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);

		this.tag = "admin-dashboard";
		this.title = "";
		this.base = "";
	}

	/**
	 * Add this table field to the table
	 */
	onPostPlace (parentHtmlElement: HTMLElement, htmlElement: HTMLElement): HTMLElement
	{
		// Set the base API url to use for this dashboard.
		if (this.base != "")
		{
			if (Hot.Data.AdminPanel == null)
				Hot.Data.AdminPanel = {};

			if (Hot.Data.AdminPanel.baseUrl == null)
				Hot.Data.AdminPanel.baseUrl = this.base;

			if (Hot.Data.AdminPanel.addUrl == null)
				Hot.Data.AdminPanel.addUrl = `${Hot.Data.AdminPanel.baseUrl}/v1/data/add`

			if (Hot.Data.AdminPanel.editUrl == null)
				Hot.Data.AdminPanel.editUrl = `${Hot.Data.AdminPanel.baseUrl}/v1/data/edit`

			if (Hot.Data.AdminPanel.removeUrl == null)
				Hot.Data.AdminPanel.removeUrl = `${Hot.Data.AdminPanel.baseUrl}/v1/data/remove`

			if (Hot.Data.AdminPanel.listUrl == null)
				Hot.Data.AdminPanel.listUrl = `${Hot.Data.AdminPanel.baseUrl}/v1/data/list`
		}

		return (null);
	}

	output (): string
	{
		return (`
		<main class="col-md-9 ms-sm-auto col-lg-10 px-md-4">
			<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
				<h1 class="h2">${this.title}</h1>
				<div class="btn-toolbar mb-2 mb-md-0">
					<div class="btn-group me-2">
						<hot-place-here name = "buttons"></hot-place-here>
					</div>
				</div>
			</div>
			<hot-place-here name = "body"></hot-place-here>
		</main>`);
	}
}
