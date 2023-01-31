import { HotStaq, Hot, HotAPI, HotComponent } from "hotstaq";
import { AdminTableField } from "./admin-table-field";

export class AdminTable extends HotComponent
{
	/**
	 * The title of this table.
	 */
	title: string;
	/**
	 * The attached schema.
	 */
	schema: string;
	/**
	 * The headers are stored in a key/value object.
	 * 
	 * @example { "name": "<th>Name</th>", "email": "<th>Email</th>" }
	 */
	headerElements: { [name: string]: any; } = {};
	/**
	 * The header indicies are stored in a key/value object.
	 * 
	 * @example console.log (this.headerIndicies["name"]); // Outputs 0
	 */
	headerIndicies: number[];
	/**
	 * The row elements are stored in an array with key/value fields and it's attached html element.
	 * 
	 * @example
	 * {
	 *   "fields": [
	 *       {
	 *         "name": "John Smith",
	 *         "email": "john.smith@test.com"
	 *       }
	 *     ],
	 *   "html": "<tr><td>John Smith</td><td>john.smith@test.com</td></tr>"
	 * }
	 */
	rowElements: { fields: any[]; html: string; }[] = [];

	constructor (copy: HotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);

		this.tag = "admin-table";
		this.title = "";
		this.schema = "";
		this.headerElements = {};
		this.headerIndicies = [];
		this.rowElements = [];
	}

	/**
	 * Add a header to the table.
	 */
	addHeader (tableFieldElement: HTMLElement)
	{
		let header = this.htmlElements[0].getElementsByTagName ("thead")[0];

		// @ts-ignore
		this.headerIndicies.push (tableFieldElement.hotComponent.field);
		header.appendChild (tableFieldElement);
	}

	/**
	 * Add a header to the table.
	 */
	addHeaderDataOnly (tableField: AdminTableField, htmlElement: HTMLElement)
	{
		this.headerIndicies.push (tableField.field);
		this.headerElements[tableField.field] = htmlElement;
	}

	/**
	 * Add a row to the table.
	 * 
	 * @param {Array} fields A list of values to append.
	 */
	addRow (fields: { [name: string]: any }[])
	{
		let tbody = this.htmlElements[1].getElementsByTagName ("tbody")[0];
		let rowStr = "<tr>";

		for (let iIdx = 0; iIdx < this.headerIndicies.length; iIdx++)
		{
			let key = this.headerIndicies[iIdx];
			let value = fields[key];

			if (this.headerElements[key] != null)
				rowStr += `<td>${value}</td>`;
		}

		rowStr += "</tr>";

		HotStaq.addHtml (tbody, rowStr);
	}

	/**
	 * Clear the list of rows.
	 */
	async clearRows ()
	{
		let tbody = this.htmlElements[1].getElementsByTagName ("tbody")[0];

		tbody.innerHTML = "";
	}

	/**
	 * Refresh the list.
	 */
	async refreshList ()
	{
		let list = await Hot.jsonRequest (`${Hot.Data.baseUrl}/v1/data/list`, {
				schema: this.schema
			});

		this.clearRows ();

		for (let iIdx = 0; iIdx < list.length; iIdx++)
		{
			let fields = list[iIdx];

			this.addRow (fields);
		}
	}

	/**
	 * Get the list of data from the server.
	 */
	async onPostPlace (parentHtmlElement: HTMLElement, htmlElement: HTMLElement): Promise<HTMLElement>
	{
		setTimeout (async () =>
			{
				await this.refreshList ();
			}, 50);

		return (htmlElement);
	}

	async output ()
	{
		return (`
		<div id = "${this.htmlElements[0].id}">
			<h2>${this.title}</h2>
			<div class="table-responsive">
			<table class="table table-striped table-sm">
				<thead hot-place-here = "header">
				</thead>
				<tbody hot-place-here = "results">
				</tbody>
			</table>
			</div>
		</div>`);
	}
}
