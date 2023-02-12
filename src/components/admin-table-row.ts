import { HotStaq, Hot, HotAPI, HotComponent, HotComponentOutput } from "hotstaq";

export class AdminTableRow extends HotComponent
{
	/**
	 * The fields are stored in a key/value object.
	 * 
	 * @example { "name": "John Smith", "email": "john.smith@email.com" }
	 */
	fields: any[];

	constructor (copy: HotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);

		this.tag = "admin-table-row";
		this.fields = [];
	}

	/**
	 * Add this table row to the table
	 */
	onPostPlace (parentHtmlElement: HTMLElement, htmlElement: HTMLElement): HTMLElement
	{
		// @ts-ignore
		parentHtmlElement.parentNode.parentNode.parentNode.hotComponent.rowElements.push ({ fields: this.fields, element: htmlElement});

		return (null);
	}

	output (): string | HotComponentOutput[]
	{
		let rowHtml = "";

		if (this.fields.length > 0)
			rowHtml += `<td><input type = "checkbox" /></td>`;

		for (let iIdx = 0; iIdx < this.fields.length; iIdx++)
		{
			let fieldObj = this.fields[iIdx];

			for (let key in fieldObj)
			{
				let value = fieldObj[key];

				rowHtml += `<td>${value}</td>`;
			}
		}

		return ([{
			html: `<tr>${rowHtml}</tr>`,
			placeHereParent: "results"
		}]);
	}
}
