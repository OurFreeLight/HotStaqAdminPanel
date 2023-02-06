import { HotStaq, Hot, HotAPI, HotComponent, HotComponentOutput } from "hotstaq";

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
	onPostPlace (parentHtmlElement: HTMLElement, htmlElement: HTMLElement): HTMLElement
	{
		// @ts-ignore
		let hotComponent = parentHtmlElement.parentNode.parentNode.parentNode.hotComponent;

		if (hotComponent != null)
			hotComponent.addHeaderDataOnly (this, htmlElement);

		return (null);
	}

	output (): string | HotComponentOutput[]
	{
		return ([{
			html: `<th>${this.inner}</th>`,
			documentSelector: "[hot-place-here='header']"
		}]);
	}
}
