import { HotStaq, Hot, HotAPI, HotComponent, HotComponentOutput } from "hotstaq";
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
	rowElements: { fields: any[]; element: HTMLElement; }[] = [];
	/**
	 * The selected row indicies. Each index maps to the rowElements array.
	 * 
	 * @fixme Add support for this in the future.
	 */
	//protected selectedRows: number[];
	/**
	 * The most recently selected row index. The index maps to the rowElements array.
	 */
	protected selected: number;

	constructor (copy: HotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);

		this.tag = "admin-table";
		this.title = "";
		this.schema = "";
		this.headerElements = {};
		this.headerIndicies = [];
		this.rowElements = [];
		//this.selectedRows = [];
		this.selected = -1;
	}

	/**
	 * Add a header to the table.
	 */
	addHeader (tableFieldElement: HTMLElement)
	{
		let header = this.htmlElements[0].getElementsByTagName ("thead")[0];

		if (this.headerIndicies.length < 1)
			this.headerIndicies.push (null);

		// @ts-ignore
		this.headerIndicies.push (tableFieldElement.hotComponent.field);
		header.appendChild (tableFieldElement);
	}

	/**
	 * Add a header to the table.
	 */
	addHeaderDataOnly (tableField: AdminTableField, htmlElement: HTMLElement)
	{
		if (this.headerIndicies.length < 1)
			this.headerIndicies.push (null);

		this.headerIndicies.push (tableField.field);
		this.headerElements[tableField.field] = htmlElement;
	}

	/**
	 * Get the field type of a field.
	 */
	getFieldType (fieldName: string): string
	{
		if (this.headerElements[fieldName] != null)
		{
			let hotComponent: AdminTableField = this.headerElements[fieldName].hotComponent;

			if (hotComponent != null)
				return (hotComponent.field_type);
		}

		return (null);
	}

	/**
	 * Executes this event when a row is selected. If this returns false, the row will not be selected.
	 */
	onSelectedRow: (rowIndex: number) => Promise<boolean> = null;

	/**
	 * Executes when a row is selected.
	 */
	async selectRow (htmlElement: HTMLElement, rowIndex: number): Promise<void>
	{
		if (this.onSelectedRow != null)
		{
			let result = await this.onSelectedRow (rowIndex);

			if (result === false)
				return;
		}

		// In the future, we will support multiple rows being selected. For now 
		// this will ensure that only one row is selected at a time.
		{
			let tbody = this.htmlElements[1].getElementsByTagName ("tbody")[0];
			let rows = tbody.getElementsByTagName ("tr");

			for (let iIdx = 0; iIdx < rows.length; iIdx++)
			{
				let row: HTMLTableRowElement = rows[iIdx];

				if (row.classList.contains ("table-primary") === true)
					row.classList.remove ("table-primary");
			}

			htmlElement.classList.add ("table-primary");
		}

		this.selected = rowIndex;

		/*this.selectedRows = [];
		let tbody = this.htmlElements[1].getElementsByTagName ("tbody")[0];

		// Find all the checkboxes in tbody.
		let checkboxes = tbody.getElementsByTagName ("input");

		for (let iIdx = 0; iIdx < checkboxes.length; iIdx++)
		{
			let checkbox: HTMLInputElement = checkboxes[iIdx];

			if (checkbox.checked != null)
			{
				if (checkbox.checked === true)
				{
					// Get the data-index attribute.
					let dataIndexStr: string = checkbox.parentElement.parentElement.getAttribute ("data-index");
					let dataIndex: number =  parseInt (dataIndexStr);

					this.selectedRows.push (dataIndex);
				}
			}
		}*/
	}

	/**
	 * Get the selected data.
	 */
	getSelected (): any[]
	{
		let index: number = this.selected;

		if (index < 0)
			return (null);

		return (this.rowElements[index].fields);
	}

	/**
	 * Get the selected data.
	 */
	/*getSelectedRows (): any[]
	{
		let rows: any[] = [];

		for (let iIdx = 0; iIdx < this.selectedRows.length; iIdx++)
		{
			let index: number = this.selectedRows[iIdx];
			rows.push (this.rowElements[index].fields);
		}

		return (rows);
	}*/

	/**
	 * Get the data for each row that has been checked.
	 */
	getCheckedRows (): any[]
	{
		let rows: any[] = [];
		let tbody = this.htmlElements[1].getElementsByTagName ("tbody")[0];

		// Find all the checkboxes in tbody.
		let checkboxes = tbody.getElementsByTagName ("input");

		for (let iIdx = 0; iIdx < checkboxes.length; iIdx++)
		{
			let checkbox: HTMLInputElement = checkboxes[iIdx];

			if (checkbox.checked != null)
			{
				if (checkbox.checked === true)
				{
					// Get the data-index attribute.
					let dataIndexStr: string = checkbox.parentElement.parentElement.getAttribute ("data-index");
					let dataIndex: number =  parseInt (dataIndexStr);

					rows.push (this.rowElements[dataIndex].fields);
				}
			}
		}

		return (rows);
	}

	/**
	 * Get a row's data.
	 */
	getRow (index: number): any[]
	{
		return (this.rowElements[index].fields);
	}

	/**
	 * Add a row to the table.
	 * 
	 * @param {Array} fields A list of values to append.
	 */
	addRow (fields: { [name: string]: any }[])
	{
		let tbody = this.htmlElements[1].getElementsByTagName ("tbody")[0];
		let index: number = this.rowElements.length;
		let rowStr = `<tr onclick = "this.parentNode.parentNode.parentNode.parentNode.hotComponent.selectRow (this, ${index});">`;

		rowStr += `<td><input type = "checkbox" /></td>`;

		for (let iIdx = 0; iIdx < this.headerIndicies.length; iIdx++)
		{
			// @ts-ignore - @fixme I messed this up, will fix.
			let key = this.headerIndicies[iIdx];
			let value = fields[key];

			if (this.headerElements[key] != null)
			{
				// @ts-ignore - @fixme I messed this up, will fix.
				let fieldType: string = this.getFieldType (key);

				if (fieldType == null)
					fieldType = "text";

				if (fieldType !== "remove")
					rowStr += `<td data-index = "${index}">${value}</td>`;
			}
		}

		rowStr += "</tr>";

		let newObj = HotStaq.addHtml (tbody, rowStr);

		this.rowElements.push ({
				fields: fields,
				element: (<HTMLElement>newObj)
			});
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
		let listUrl: string = Hot.Data.AdminPanel.listUrl;

		let list = await Hot.jsonRequest (listUrl, {
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
	onPostPlace (parentHtmlElement: HTMLElement, htmlElement: HTMLElement): HTMLElement
	{
		setTimeout (async () =>
			{
				await this.refreshList ();
			}, 50);

		return (null);
	}

	output (): string | HotComponentOutput[]
	{
		return (`
		<div id = "${this.htmlElements[0].id}">
			<h2>${this.title}</h2>
			<div class="table-responsive">
			<table id = "${this.htmlElements[0].id}Table" class="table table-striped table-sm">
				<thead>
					<tr hot-place-here = "header">
						<th></th>
					</tr>
				</thead>
				<tbody hot-place-here = "results">
				</tbody>
			</table>
			<hot-place-here name = "afterTable"></hot-place-here>
			</div>
		</div>`);
	}
}
