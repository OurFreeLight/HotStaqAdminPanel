import { HotStaq, Hot, HotAPI, HotComponent, HotComponentOutput } from "hotstaq";

export class AdminText extends HotComponent
{
	/**
	 * The associated database field.
	 */
	field: string;
	/**
	 * The type of field. Can be:
	 * * text
	 * * date
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

		this.tag = "admin-text";
		this.field = "";
		this.field_type = "text";
		this.no_output = "0";
	}

	/**
	 * Corrects the placement of the text elements for modals.
	 */
	onPostPlace (parentHtmlElement: HTMLElement, htmlElement: HTMLElement): HTMLElement
	{
		let placeHereArray = parentHtmlElement.querySelectorAll (`hot-place-here[type="modal"]`);

		// Search for the input box in the modal we attached to, then store the 
		// found input box into the fieldElements array.
		if (placeHereArray.length > 0)
		{
			let placeHere = placeHereArray[0];
			parentHtmlElement.removeChild (htmlElement);
			placeHere.appendChild (htmlElement);

			// @ts-ignore
			parentHtmlElement.hotComponent.fieldElements[this.field] = htmlElement.querySelector ("input");
		}

		return (null);
	}

	output (): string | HotComponentOutput[]
	{
		let value: string = "";

		if (this.value != null)
			value = this.value;

		if (this.no_output === "1")
			return (`<div><input class="form-control" type = "hidden" value = "${value}" /></div>`);

		return (`<div>
			<label class="form-label">${this.inner}</label><input class="form-control" type = "text" value = "${value}" />
		</div>`);
	}
}
