import { HotStaq, Hot, HotAPI, HotComponent, HotComponentOutput } from "hotstaq";
import { AdminTable } from "./admin-table";

export class AdminTableField extends HotComponent
{
	/**
	 * The table field.
	 */
	field: number;
	/**
	 * The type of field. Can be:
	 * * text
	 * * remove
	 * 
	 * Default: text
	 */
	field_type: string;
	/**
	 * If set to 1, this will not output the field.
	 */
	no_output: string;

	constructor (copy: HotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);

		this.tag = "admin-table-field";
		this.field = 0;
		this.field_type = "text";
		this.no_output = "0";
	}

	/**
	 * Add this table field to the table
	 */
	onPostPlace (parentHtmlElement: HTMLElement, htmlElement: HTMLElement): HTMLElement
	{
		let hotComponent: AdminTable = null;

		// @ts-ignore
		if (parentHtmlElement.parentNode.parentNode.hotComponent != null)
		{
			// @ts-ignore
			hotComponent = parentHtmlElement.parentNode.parentNode.hotComponent;
		}
		else
		{
			// @ts-ignore - looool. Add a better way to get the parent HotComponent.
			hotComponent = parentHtmlElement.parentNode.parentNode.parentNode.parentNode.hotComponent;
		}

		if (hotComponent != null)
			hotComponent.addHeaderDataOnly (this, htmlElement);

		return (null);
	}

	output (): string | HotComponentOutput[]
	{
		if (this.no_output === "1")
		{
			return ([{
				html: `<div></div>`,
				placeHereParent: "afterTable"
			}]);
		}

		return ([{
			html: `<th>${this.inner}</th>`,
			placeHereParent: "header"
		}]);
	}
}
