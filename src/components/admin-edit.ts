import { HotStaq, Hot, HotAPI, HotComponent } from "hotstaq";

export class AdminEdit extends HotComponent
{
	/**
	 * The title of this edit modal.
	 */
	title: string;
	/**
	 * The button title.
	 */
	button_title: string;
	/**
	 * The attached list.
	 */
	attached_list: string;
	/**
	 * The attached schema.
	 */
	schema: string;
	/**
	 * The field elements in the edit modal.
	 */
	fieldElements: { [name: string]: any; };
	/**
	 * The modal id.
	 */
	modalId: string;

	constructor (copy: HotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);

		this.tag = "admin-edit";
		this.title = "";
		this.button_title = "";
		this.attached_list = "";
		this.schema = "";

		this.fieldElements = {};

		this.modalId = "";
	}

	/**
	 * Save this form.
	 */
	async onSave ()
	{
		let values: any = {};

		for (let key in this.fieldElements)
		{
			let fieldElement = this.fieldElements[key];
			let value = fieldElement.value;

			values[key] = value;
		}

		await Hot.jsonRequest (`${Hot.Data.baseUrl}/v1/data/add`, {
				schema: this.schema,
				fields: values
			});

		let attachedList = document.getElementById (this.attached_list);

		// @ts-ignore
		await attachedList.hotComponent.refreshList ();

		// @ts-ignore
		$(`#${this.modalId}`).modal ("hide");
	}

	async output ()
	{
		if (this.name === "")
			throw new Error (`You must specify a name for each admin-edit element!`);

		this.modalId = `${this.name}Modal`;

		return ([{
			html: `
			<!-- ${this.title} Modal Start -->
			<div class="modal fade" id="${this.modalId}" tabindex="-1" aria-labelledby="${this.name}ModalLabel" aria-hidden="true">
				<div class="modal-dialog">
					<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title" id="${this.name}ModalLabel">${this.title}</h5>
						<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
					</div>
					<div class="modal-body">
						<hot-place-here name = "modalBody" type = "modal"></hot-place-here>
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
						<button type="button" class="btn btn-primary" onclick = "document.getElementById('${this.modalId}').onSave ();">${this.button_title}</button>
					</div>
					</div>
				</div>
			</div>
			<!-- ${this.title} Modal End -->`,
			parentSelector: "body"
		},
		{
			html: `<button id = "${this.modalId}-add-btn" type="button" class="btn btn-sm btn-outline-secondary" data-bs-toggle="modal" data-bs-target="#${this.modalId}">Add</button>`,
			//`<button id = "${this.modalId}-add-btn" type="button" class="btn btn-sm btn-outline-secondary" data-bs-toggle="modal" onclick = "$('#${this.modalId}').modal ('show');">Add</button>`,
			parentSelector: `hot-place-here[name="buttons"]`
		}]);
	}
}
