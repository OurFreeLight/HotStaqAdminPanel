import { HotStaq, Hot, HotAPI, HotComponent, HotComponentOutput } from "hotstaq";
import { AdminTableField } from "./admin-table-field";
import { AdminEdit } from "./admin-edit";

import DataTable, { Api } from "datatables.net";
import dt5 from 'datatables.net-bs5';
import dtc from 'datatables.net-colreorder-bs5';
import dts from 'datatables.net-scroller-bs5';
import dtsb from 'datatables.net-searchbuilder-bs5';

/**
 * The properties for the list search.
 */
export interface IListSearchProperties
{
	/**
	 * The search.
	 */
	search?: string;
	/**
	 * The start index.
	 */
	offset?: number;
	/**
	 * The length.
	 */
	limit?: number;
}

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
	headers: {
		/**
		 * The stored header fields.
		 */
		fields: { [name: string]: AdminTableField; };
		/**
		 * The headers are stored in a key/value object.
		 * 
		 * @example { "name": "<th>Name</th>", "email": "<th>Email</th>" }
		 */
		elements: { [name: string]: any; };
		/**
		 * The header indicies are stored in a key/value object.
		 * 
		 * @example console.log (this.headerIndicies["name"]); // Outputs 0
		 */
		indicies: number[];
	};
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
	/**
	 * The list function to execute to retrieve data.
	 */
	onlist: (search: IListSearchProperties) => Promise<{ length: number; data: any[]; }>;
	/**
	 * The list url to use for this table. Hot.Data.AdminPanel.listUrl will not be used in this case.
	 */
	listurl: string;
	/**
	 * If set to true, each row will have a checkbox.
	 * @default true
	 */
	checkbox: boolean;
	/**
	 * If set to true, a single click will allow the user to edit the row.
	 */
	singleclickedit: boolean;
	/**
	 * Executes this event when a row is selected. The potential item to be selected 
	 * will also be passed. If this returns false, the row will not be selected.
	 */
	onselectedrow: (rowIndex: number, item: any[]) => Promise<boolean>;
	/**
	 * The attached edit form, if any.
	 */
	attachedEdit: AdminEdit;
	/**
	 * The associated DataTable.
	 */
	dataTable: DataTable<Api>;
	/**
	 * Indicates if the list is refreshing.
	 */
	isListRefreshing: boolean;

	constructor (copy: HotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);

		this.tag = "admin-table";
		this.title = "";
		this.schema = "";
		this.headers = {
				fields: {},
				elements: {},
				indicies: []
			};
		this.rowElements = [];
		//this.selectedRows = [];
		this.onlist = null;
		this.listurl = "";
		this.checkbox = true;
		this.singleclickedit = false;
		this.onselectedrow = null;
		this.attachedEdit = null;
		this.selected = -1;
		this.dataTable = null;
		this.isListRefreshing = false;
	}

	/**
	 * Add a header to the table.
	 */
	addHeader (tableFieldElement: HTMLElement)
	{
		let header = this.htmlElements[0].getElementsByTagName ("thead")[0];

		if (this.headers.indicies.length < 1)
			this.headers.indicies.push (null);

		// @ts-ignore
		this.headers.indicies.push (tableFieldElement.hotComponent.field);
		header.appendChild (tableFieldElement);
	}

	/**
	 * Add a header to the table.
	 */
	addHeaderDataOnly (tableField: AdminTableField, htmlElement: HTMLElement)
	{
		if (this.headers.indicies.length < 1)
			this.headers.indicies.push (null);

		this.headers.indicies.push (tableField.field);
		this.headers.fields[tableField.field] = tableField;
		this.headers.elements[tableField.field] = htmlElement;
	}

	/**
	 * Get the field type of a field.
	 */
	getFieldType (fieldName: string): string
	{
		if (this.headers.elements[fieldName] != null)
		{
			let hotComponent: AdminTableField = this.headers.elements[fieldName].hotComponent;

			if (hotComponent != null)
				return (hotComponent.field_type);
		}

		return (null);
	}

	/**
	 * Executes when a row is selected.
	 */
	async selectRow (htmlElement: HTMLElement, rowIndex: number): Promise<void>
	{
		if (this.onselectedrow != null)
		{
			if (typeof (this.onselectedrow) === "string")
				this.onselectedrow = (<(rowIndex: number, item: any[]) => Promise<boolean>>new Function (this.onselectedrow));

			let item: any[] = null;

			if (this.rowElements[rowIndex] != null)
				item = this.rowElements[rowIndex].fields;

			let result = await this.onselectedrow (rowIndex, item);

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

		if (typeof (this.singleclickedit) === "string")
			this.singleclickedit = HotStaq.parseBoolean (this.singleclickedit);

		if (this.singleclickedit === true)
		{
			if (this.attachedEdit != null)
				await this.attachedEdit.editClicked (this);
		}

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
		if (fields == null)
			return;

		if (fields.length == 0)
			return;

		let tbody = this.htmlElements[1].getElementsByTagName ("tbody")[0];
		let index: number = this.rowElements.length;
		//let rowStr = `<tr onclick = "this.parentNode.parentNode.parentNode.parentNode.hotComponent.selectRow (this, ${index});">`;

		if (typeof (this.checkbox) === "string")
			this.checkbox = HotStaq.parseBoolean (this.checkbox);

		/*if (this.checkbox === true)
			rowStr += `<td><input type = "checkbox" /></td>`;
		else
			rowStr += `<td></td>`;*/
		let rowsFields: any[] = [];

		for (let iIdx = 0; iIdx < this.headers.indicies.length; iIdx++)
		{
			// @ts-ignore - @fixme I messed this up, will fix.
			let key: string = this.headers.indicies[iIdx];

			if (key == null)
				continue;

			// @ts-ignore
			let value = fields[key];
			// For each . in key we need to get the next object.
			let keyParts: string[] = key.split (".");
			
			if (keyParts.length > 1)
			{
				// @ts-ignore
				let tempValue: any = fields[keyParts[0]];

				for (let iIdx = 1; iIdx < keyParts.length; iIdx++)
				{
					const part: string = keyParts[iIdx];

					tempValue = tempValue[part];
				}

				value = tempValue;
			}

			let rowObj = null;

			if (this.headers.elements[key] != null)
			{
				// @ts-ignore - @fixme I messed this up, will fix.
				let fieldType: string = this.getFieldType (key);

				if (fieldType == null)
					fieldType = "text";

				if (fieldType !== "remove")
				{
					const orgField = this.headers.fields[key];
					let defaultOutput: boolean = true;

					if (orgField != null)
					{
						if (orgField.oninput != null)
						{
							if (typeof (orgField.oninput) === "string")
								this.headers.fields[key].oninput = (<(item: any) => any>new Function (orgField.oninput));

							value = orgField.oninput (value);
						}

						if (orgField.onoutput != null)
						{
							if (typeof (orgField.onoutput) === "string")
								this.headers.fields[key].onoutput = (<(index: number, value: string) => string>new Function (orgField.onoutput));

							defaultOutput = false;
							const newOutput: string = orgField.onoutput (index, value);
							//rowStr += newOutput;
							rowObj = { index: index, value: newOutput };
						}
					}

					if (defaultOutput === true)
					{
						//rowStr += `<td data-index = "${index}">${value}</td>`;
						rowObj = value;
					}
				}
			}

			rowsFields.push (rowObj);
		}

		// @ts-ignore
		this.dataTable.row.add (rowsFields);
		/*rowStr += "</tr>";

		let newObj = HotStaq.addHtml (tbody, rowStr);

		this.rowElements.push ({
				fields: fields,
				element: (<HTMLElement>newObj)
			});*/
	}

	/**
	 * Clear the list of rows.
	 */
	async clearRows ()
	{
		this.rowElements = [];

		/*let tbody = this.htmlElements[1].getElementsByTagName ("tbody")[0];

		tbody.innerHTML = "";*/
		// @ts-ignore
		this.dataTable.clear ();
	}

	/**
	 * Refresh the list.
	 * 
	 * @returns The total number of rows available in the list.
	 */
	async refreshList (list: { length: number; data: any[]; error?: string; } = null): Promise<number>
	{
		this.isListRefreshing = true;

		let search: IListSearchProperties = {
				search: "",
				offset: 0,
				limit: 10
			};

		if (this.dataTable != null)
		{
			// @ts-ignore
			const searchStr: string = this.dataTable.search ();
			// @ts-ignore
			const info = this.dataTable.page.info ();

			search = {
				search: searchStr || "",
				// @ts-ignore
				offset: info.start || 0,
				// @ts-ignore
				limit: info.length || 10
			};
		}

		if (this.onlist != null)
		{
			if (typeof (this.onlist) === "string")
				this.onlist = (<(search: IListSearchProperties) => Promise<{ length: number; data: any[]; }>>new Function (this.onlist));

			list = await this.onlist (search);
		}
		else
		{
			let listUrl: string = "";

			if (this.listurl !== "")
				listUrl = this.listurl;

			if (listUrl !== "")
			{
				list = await Hot.jsonRequest (listUrl, {
						schema: this.schema,
						search: search
					});
			}
		}

		this.clearRows ();

		if (list != null)
		{
			if (list.error != null)
			{
				console.error (`List error: ${list.error}`);
				this.isListRefreshing = false;

				return (0);
			}

			for (let iIdx = 0; iIdx < list.data.length; iIdx++)
			{
				let fields = list.data[iIdx];

				this.addRow (fields);
			}
		}

		let tbody = this.htmlElements[1].getElementsByTagName ("tbody")[0];
		$(tbody).on ('click', 'tr', function ()
			{
				debugger;
				const index = this.dataTable.row (this).index ();
				this.parentNode.parentNode.parentNode.parentNode.hotComponent.selectRow (this, index);
			});

		this.isListRefreshing = false;

		let length = 0;

		if (list != null)
			length = list.length;

		return (length);
	}

	/**
	 * Get the list of data from the server.
	 */
	onPostPlace (parentHtmlElement: HTMLElement, htmlElement: HTMLElement): HTMLElement
	{
		setTimeout (async () =>
			{
				const table = $(htmlElement).find("table");
				// @ts-ignore
				this.dataTable = new DataTable (table[0], {
					processing: true,
					serverSide: true,
					colReorder: true,
					scroller: true,
					dom: 'Qlfrtip',
					data: [],
					ajax: async (data, callback, settings) =>
						{
							if (this.isListRefreshing === true)
								return;

							const maxRows = await this.refreshList ();

							// @ts-ignore
							const currentData = this.dataTable.data ().toArray ();

							callback ({
								// @ts-ignore
								draw: data.draw,
								recordsTotal: maxRows,
								recordsFiltered: maxRows,
								data: currentData
							});
						}
					});
			}, 50);

		return (null);
	}

	output (): string | HotComponentOutput[]
	{
		let emptyCheckboxHeader: string = "<th></th>";

		return (`
		<div id = "${this.htmlElements[0].id}">
			<h2>${this.title}</h2>
			<div class="table-responsive">
			<table id = "${this.htmlElements[0].id}Table" class="table table-striped table-sm">
				<thead>
					<tr hot-place-here = "header">
						${emptyCheckboxHeader}
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
