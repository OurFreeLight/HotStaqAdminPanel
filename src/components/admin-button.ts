import { HotStaq, Hot, HotAPI, HotComponent } from "hotstaq";

export class AdminButton extends HotComponent
{
	/**
	 * Executes when the button is clicked.
	 */
	onclick: (event: MouseEvent) => Promise<any>;

	constructor (copy: HotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);

		this.tag = "admin-button";
		this.onclick = null;
	}

	async buttonClicked (): Promise<void>
	{
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
			parentHtmlElement.hotComponent.fieldElements[this.field] = htmlElement;
		}

		if (this.onclick != null)
		{
			if (typeof (this.onclick) === "string")
				this.onclick = (<(event: MouseEvent) => Promise<any>>new Function (this.onclick));

			htmlElement.addEventListener ("click", this.onclick);
		}

		return (null);
	}

	output (): string
	{
		return (`<button id = "${this.htmlElements[0].id}" onclick = "this.buttonClicked ();">${this.inner}</button>`);
	}
}
