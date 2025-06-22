import { HotStaq, Hot, HotAPI, HotComponent, HotComponentOutput } from "hotstaq";
import { AdminTableField } from "./admin-table-field";
import { AdminEdit } from "./admin-edit";

import DataTable, { Api, ConfigColumns, InternalSettings } from "datatables.net";
import dt5 from 'datatables.net-bs5';
import dtc from 'datatables.net-colreorder-bs5';
import dts from 'datatables.net-scroller-bs5';
import dtsb from 'datatables.net-searchbuilder-bs5';
import dtsel from 'datatables.net-select-bs5';

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

/**
 * The API response that is expected to be returned.
 */
export interface IAPIResponse
{
	/**
	 * The length of the data.
	 */
	length: number;
	/**
	 * The data to return.
	 */
	data: any[];
	/**
	 * The error message, if any.
	 */
	error?: string;
	/**
	 * Can enable/disable sanitization of the returning data.
	 */
	hotSanitize?: boolean;
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
	 * The table callback for when updating data.
	 */
	tableCallback: ((data: any) => void);
	/**
	 * The table data for when updating data.
	 */
	protected tableData: any;
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
	onlist: (search: IListSearchProperties) => Promise<IAPIResponse>;
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
		this.tableCallback = null;
		this.tableData = null;
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
				await this.attachedEdit.editClicked (this.name);
		}

		if (this.onselectedrow != null)
		{
			if (typeof (this.onselectedrow) === "string")
				this.onselectedrow = (<(rowIndex: number, item: any[]) => Promise<boolean>>new Function (this.onselectedrow));

			let item: any[] = this.getSelected ();

			if (item == null)
				return;

			let result = await this.onselectedrow (rowIndex, item);

			if (result === false)
				return;
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

		// @ts-ignore
		const result = this.dataTable.row(index).data();

		return (result);
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

		if (this.rows == null)
			this.rows = [];

		// @ts-ignore
		//this.dataTable.row.add (rowsFields);
		//this.rows.push (rowsFields);
		/*rowStr += "</tr>";

		let newObj = HotStaq.addHtmlUnsafe (tbody, rowStr);

		this.rowElements.push ({
				fields: fields,
				element: (<HTMLElement>newObj)
			});*/
	}

	rows: any[];

	/**
	 * Clear the list of rows.
	 */
	async clearRows ()
	{
		this.rowElements = [];

		/*let tbody = this.htmlElements[1].getElementsByTagName ("tbody")[0];

		tbody.innerHTML = "";*/

		if (this.dataTable != null)
		{
			// @ts-ignore
			this.dataTable.clear ();
		}
	}

	/**
	 * Refresh the list.
	 * 
	 * @returns The total number of rows available in the list.
	 */
	async refreshList (list: IAPIResponse = null): Promise<IAPIResponse>
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
				this.onlist = (<(search: IListSearchProperties) => Promise<IAPIResponse>>new Function (this.onlist));

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

				return (null);
			}

			for (let iIdx = 0; iIdx < list.data.length; iIdx++)
			{
				let elm = list.data[iIdx];

				for (let key in elm)
				{
					let value = elm[key];
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
								const newOutput: string = orgField.onoutput (iIdx, value);
								value = newOutput;
							}
						}

						list.data[iIdx][key] = value;
					}
				}
			}
		}

		let tbody = this.htmlElements[1].getElementsByTagName ("tbody")[0];
		// @ts-ignore
		tbody.hotComponent = this;
		$(tbody).on ('click', 'tr', function ()
			{
				const hotComponent: AdminTable = this.parentNode.hotComponent;
				// @ts-ignore
				const index = hotComponent.dataTable.row (this).index ();

				if (index != null)
					hotComponent.selectRow (this, index);
				else
				{
					if (hotComponent.attachedEdit != null)
					{
						if (hotComponent.attachedEdit.addClicked != null)
							hotComponent.attachedEdit.addClicked ();
					}
				}
			});

		this.isListRefreshing = false;

		return (list);
	}

	/**
	 * Prepare data.
	 */
	prepareData (currentData: any[] | IAPIResponse): {
			draw: any;
			data: any[];
			recordsTotal: number;
			recordsFiltered: number;
		}
	{
		const callbackObj: any = {
			draw: this.tableData,
			data: [],
			recordsTotal: 0,
			recordsFiltered: 0
		};

		if (currentData != null)
		{
			if (! (currentData instanceof Array))
			{
				if (currentData.length != null)
				{
					callbackObj.recordsTotal = currentData.length;
					callbackObj.recordsFiltered = currentData.length;
				}

				if (currentData.data != null)
					callbackObj.data = currentData.data;
			}
			else
			{
				callbackObj.data = currentData;
				callbackObj.recordsTotal = currentData.length;
				callbackObj.recordsFiltered = currentData.length;
			}

			let sanitize = true;

			if (callbackObj.data.hotSanitize != null)
				sanitize = callbackObj.data.hotSanitize;

			for (let iIdx = 0; iIdx < callbackObj.data.length; iIdx++)
			{
				const row = callbackObj.data[iIdx];

				if (sanitize === true)
					callbackObj.data[iIdx] = HotStaq.sanitizeJSON (row);
				else
					callbackObj.data[iIdx] = row;
			}
		}

		return (callbackObj);
	}

	/**
	 * Get the list of data from the server.
	 */
	onPostPlace (parentHtmlElement: HTMLElement, htmlElement: HTMLElement): HTMLElement
	{
		setTimeout (async () =>
			{
				const table = $(htmlElement).find("table");

				// The data stored in columns should be considered safe as it comes directly from 
				// the HTML after load.
				let columns: ConfigColumns[] = [];
				$(table).find ("thead th").each (function ()
					{
						const text = $(this).text ();
						const data = $(this).data ("field");
						let dataType = $(this).data ("field-type");

						if ((text == null) || (text === ""))
							return;

						if ((data == null) || (data === ""))
							return;

						if (dataType === "text")
							dataType = "string";

						columns.push({
								title: text,
								data: data
							});
					});

				$(table).find ("thead").remove ();

				// @ts-ignore
				this.dataTable = new DataTable (table[0], {
					processing: true,
					serverSide: true,
					colReorder: true,
					scroller: true,
					select: true,
					dom: 'Qlfrtip',
					columns: columns,
					data: [],
					ajax: async (data: object, callback: ((data: any) => void), settings: InternalSettings) =>
						{
							if (this.isListRefreshing === true)
								return;

							this.tableCallback = callback;
							// @ts-ignore
							this.tableData = data.draw;

							let currentData = await this.refreshList ();
							const preparedData = this.prepareData (currentData);

							this.tableCallback (preparedData);
						}
					});
			}, 50); /// @todo Fix this stupid hack. This should happen slightly after the document has been loaded.

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
