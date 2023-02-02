import { HotStaq, Hot, HotAPI, HotComponent } from "hotstaq";

export class AdminTableField extends HotComponent
{
	/**
	 * The table field.
	 */
	field: number;

	constructor (copy: HotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);

		this.tag = "admin-table-field";
		this.field = 0;
	}

	/**
	 * Add this table field to the table
	 */
	// @ts-ignore
	async onPostPlace (parentHtmlElement: HTMLElement, htmlElement: HTMLElement): Promise<HTMLElement>
	{
		// @ts-ignore
		let hotComponent = parentHtmlElement.parentNode.parentNode.parentNode.hotComponent;

		if (hotComponent != null)
			hotComponent.addHeaderDataOnly (this, htmlElement);
	}

	async output ()
	{
		return ([{
			html: `<th>${this.inner}</th>`,
			placeHereParent: "header"
		}]);
	}
}
