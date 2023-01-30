import { HotStaq, Hot, HotAPI, HotComponent, IHotComponent } from "hotstaq";

export class AdminText extends HotComponent
{
	/**
	 * The associated database field.
	 */
	field: string;

	constructor (copy: IHotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);

		this.tag = "admin-text";
		this.field = "";
	}

	/**
	 * Corrects the placement of the text elements for modals.
	 */
	async onParentPlace (parentHtmlElement: HTMLElement, htmlElement: HTMLElement): Promise<void>
	{
		let placeHereArray = parentHtmlElement.querySelectorAll (`hot-place-here[type="modal"]`);

		if (placeHereArray.length > 0)
		{
			let placeHere = placeHereArray[0];
			parentHtmlElement.removeChild (htmlElement);
			placeHere.appendChild (htmlElement);

			// @ts-ignore
			parentHtmlElement.hotComponent.fieldElements[this.field] = htmlElement.querySelector ("input");
		}
	}

	async output ()
	{
		return (`<div>
			<label class="form-label">${this.inner}</label><input class="form-control" type = "text" value = "" />
		</div>`);
	}
}

Hot.CurrentPage.processor.addComponent (AdminText);