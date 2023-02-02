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
	// @ts-ignore
	async onPostPlace (parentHtmlElement: HTMLElement, htmlElement: HTMLElement): Promise<HTMLElement>
	{
		// Set the base API url to use for this dashboard.
		if (this.base != "")
			Hot.Data.baseUrl = this.base;
	}

	async output (): Promise<string>
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
