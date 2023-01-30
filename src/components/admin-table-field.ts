import { HotStaq, Hot, HotAPI, HotComponent, IHotComponent } from "hotstaq";

export class AdminTableField extends HotComponent
{
	/**
	 * The table field.
	 */
	field: number;

	constructor (copy: IHotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);

		this.tag = "admin-table-field";
		this.field = 0;
	}

	/**
	 * Add this table field to the table
	 */
	async onPostPlace (parentHtmlElement: HTMLElement, htmlElement: HTMLElement): Promise<HTMLElement>
	{
		// @ts-ignore
		let hotComponent = parentHtmlElement.parentNode.parentNode.parentNode.hotComponent;

		hotComponent.addHeaderDataOnly (this, htmlElement);

		return (htmlElement);
	}

	async output ()
	{
		return ([{
			html: `<th>${this.inner}</th>`,
			placeHereParent: "header"
		}]);
	}
}

Hot.CurrentPage.processor.addComponent (AdminTableField);