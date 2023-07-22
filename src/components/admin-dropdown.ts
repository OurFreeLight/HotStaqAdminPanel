import { HotStaq, Hot, HotAPI, HotComponent } from "hotstaq";

export class AdminDropdown extends HotComponent
{
	/**
	 * The search string placeholder to show.
	 */
	placeholder: string;
	/**
	 * Executes when the keyboard up button is triggered.
	 */
	onsearch: (searchText: string, event: KeyboardEvent) => Promise<{ url: string; value: string; text: string; }[]>;
	/**
	 * Executes when an search result has been selected.
	 */
	onselect: (url: string, value: string, text: string) => Promise<void>;

	constructor (copy: HotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);

		this.tag = "admin-dropdown";
		this.placeholder = "Search";
		this.onsearch = null;
		this.onselect = null;
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

		if (this.onsearch != null)
		{
			if (typeof (this.onsearch) === "string")
				this.onsearch = (<(searchText: string, event: KeyboardEvent) => Promise<{ url: string; value: string; text: string; }[]>>new Function (this.onsearch));

			htmlElement.querySelector ("input").addEventListener ("keyup", 
				async (event: KeyboardEvent) =>
				{
					// @ts-ignore
					const searchText = event.currentTarget.value;

					let results = await this.onsearch (searchText, event);

					let searchResultsDiv = $(this.htmlElements[1]).find (".searchResults");

					searchResultsDiv.empty ();

					for (let iIdx = 0; iIdx < results.length; iIdx++)
					{
						const result = results[iIdx];
						let url: string = result.url;
						let value: string = result.value;
						let text: string = result.text;

						searchResultsDiv.append ($(`<li><a class=\"dropdown-item\" href=\"${url}\" data-value = "${value}" onclick = \"this.parentNode.parentNode.parentNode.parentNode.hotComponent.selected (${iIdx});\">${text}</a></li>`));
					}
				});
		}

		return (null);
	}

	/**
	 * Executed when an item is selected.
	 */
	async selected (index: number): Promise<void>
	{
		if (this.onselect != null)
		{
			if (typeof (this.onselect) === "string")
				this.onselect = (<(url: string, value: string, text: string) => Promise<void>>new Function (this.onselect));

			const url = this.htmlElements[1].querySelectorAll ("a")[index].getAttribute ("href");
			const value = this.htmlElements[1].querySelectorAll ("a")[index].getAttribute ("data-value");
			const text = this.htmlElements[1].querySelectorAll ("a")[index].innerHTML;

			await this.onselect (url, value, text);
		}
	}

	output (): string
	{
		return (
	`<div class="dropdown">
		<button class="btn btn-primary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
		  ${this.inner}
		</button>
		<ul class="dropdown-menu">
			<li>
				<div class = "input-group">
					<input type = "text" class = "form-control" placeholder = "${this.placeholder}" value = "" />
				</div>
			</li>
			<div class = "searchResults">
			</div>
		</ul>
	</div>`);
	}
}
