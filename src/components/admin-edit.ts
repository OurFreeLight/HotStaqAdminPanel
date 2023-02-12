import { HotStaq, Hot, HotAPI, HotComponent, HotComponentOutput } from "hotstaq";

import bootstrap from "bootstrap";

import { AdminTable } from "./admin-table";

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
	/**
	 * The bootstrap modal instance.
	 */
	modal: bootstrap.Modal;
	/**
	 * If set to true, this will close the modal when save is clicked.
	 */
	closeOnSave: boolean;
	/**
	 * The type of modal to open. Can be:
	 * * add
	 * * edit
	 * * remove
	 */
	protected modalType: string;
	/**
	 * The selected fields.
	 */
	protected selectedFields: any[];

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
		this.modal = null;
		this.modalType = "add";
		this.closeOnSave = true;
		this.selectedFields = [];
	}

	/**
	 * The event that can be called when the add button is clicked.
	 * This is called before the add modal opens.
	 */
	onAddClicked: () => Promise<boolean> = null;

	/**
	 * Executes when the add button is clicked.
	 */
	async addClicked (): Promise<void>
	{
		if (this.onAddClicked != null)
		{
			let result = await this.onAddClicked ();

			if (result === false)
				return;
		}

		this.modalType = "add";

		// Clear the values in each field.
		for (let key in this.fieldElements)
		{
			let fieldElement = this.fieldElements[key];

			fieldElement.value = "";
		}

		this.selectedFields = [];

		bootstrap.Modal.getInstance (`#${this.modalId}`).show ();
	}

	/**
	 * The event that can be called when the edit button is clicked.
	 * This is called before the edit modal opens.
	 */
	onEditClicked: () => Promise<boolean> = null;

	/**
	 * Executes when the edit button is clicked.
	 */
	async editClicked (): Promise<void>
	{
		if (this.onEditClicked != null)
		{
			let result = await this.onEditClicked ();

			if (result === false)
				return;
		}

		this.modalType = "edit";
		let attachedList = document.getElementById (this.attached_list);

		// @ts-ignore
		let hotComponent: AdminTable = attachedList.hotComponent;
		let selectedField = hotComponent.getSelected ();

		if (selectedField != null)
		{
			for (let key in this.fieldElements)
			{
				let fieldElement = this.fieldElements[key];

				if (fieldElement != null)
				{
					// @ts-ignore
					let value = selectedField[key];

					fieldElement.value = value;
				}
			}

			this.selectedFields = [selectedField];

			bootstrap.Modal.getInstance (`#${this.modalId}`).show ();
		}
	}

	/**
	 * The event that can be called when the remove button is clicked.
	 * This is called before the remove modal opens.
	 */
	onRemoveClicked: () => Promise<boolean> = null;

	/**
	 * Executes when the remove button is clicked.
	 */
	async removeClicked (): Promise<void>
	{
		if (this.onRemoveClicked != null)
		{
			let result = await this.onRemoveClicked ();

			if (result === false)
				return;
		}

		this.modalType = "remove";

		let attachedList = document.getElementById (this.attached_list);
		// @ts-ignore
		let hotComponent: AdminTable = attachedList.hotComponent;
		let checkedRows = hotComponent.getCheckedRows ();
		let whereFields: any[] = [];

		if (checkedRows.length > 0)
		{
			for (let i = 0; i < checkedRows.length; i++)
			{
				let checkedRow = checkedRows[i];
				whereFields.push (checkedRow);
			}
		}

		let selectedField = hotComponent.getSelected ();

		if (selectedField != null)
			whereFields = [selectedField];

		if (whereFields.length > 0)
		{
			const confirmed: boolean = confirm ("Are you sure you want to remove this item?");

			if (confirmed === true)
			{
				for (let i = 0; i < whereFields.length; i++)
				{
					let whereField = whereFields[i];

					// Remove any fields that are marked as remove.
					for (let key in whereField)
					{
						let fieldType = hotComponent.getFieldType (key);

						if (fieldType != null)
						{
							if (fieldType === "remove")
								delete whereField[key];
						}
					}

					let removeUrl: string = Hot.Data.AdminPanel.removeUrl;

					await Hot.jsonRequest (removeUrl, {
							schema: this.schema,
							whereFields: whereField
						});
				}
		
				await hotComponent.refreshList ();
			}
		}
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

			if (fieldElement != null)
			{
				let value = fieldElement.value;
				let fieldType: string = fieldElement.parentNode.hotComponent.field_type;

				if (fieldType === "remove")
					continue;

				values[key] = value;
			}
		}

		if (this.modalType === "add")
		{
			let addUrl: string = Hot.Data.AdminPanel.addUrl;

			await Hot.jsonRequest (addUrl, {
					schema: this.schema,
					fields: values
				});
		}

		if (this.modalType === "edit")
		{
			if (this.selectedFields.length === 0)
			{
				alert ("No item(s) selected!");

				return;
			}

			let selectedField = this.selectedFields[0];
			let whereFields: any = {};

			for (let key in selectedField)
			{
				let fieldElement = this.fieldElements[key];
				let value = selectedField[key];

				if (fieldElement != null)
				{
					let fieldType: string = fieldElement.parentNode.hotComponent.field_type;

					if (fieldType === "remove")
						continue;
				}

				whereFields[key] = value;
			}

			let editUrl: string = Hot.Data.AdminPanel.editUrl;

			await Hot.jsonRequest (editUrl, {
					schema: this.schema,
					whereFields: whereFields,
					fields: values
				});
		}

		let attachedList = document.getElementById (this.attached_list);
		// @ts-ignore
		let table: AdminTable = attachedList.hotComponent;

		await table.refreshList ();

		if (this.closeOnSave === true)
		{
			bootstrap.Modal.getInstance (`#${this.modalId}`).hide ();
		}
	}

	/**
	 * Get the list of data from the server.
	 */
	onPostPlace (parentHtmlElement: HTMLElement, htmlElement: HTMLElement): HTMLElement
	{
		this.modal = new bootstrap.Modal ($(`#${this.modalId}`)[0], {
				"backdrop": true,
				"keyboard": true,
				"focus": true
			});

		return (null);
	}

	output (): string | HotComponentOutput[]
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
			documentSelector: "body"
		},
		{
			html: `<button id = "${this.modalId}-add-btn" type="button" class="btn btn-sm btn-outline-secondary" onclick = "this.addClicked ();">Add</button>`,
			documentSelector: `hot-place-here[name="buttons"]`
		},
		{
			html: `<button id = "${this.modalId}-edit-btn" type="button" class="btn btn-sm btn-outline-secondary" onclick = "this.editClicked ();">Edit</button>`,
			documentSelector: `hot-place-here[name="buttons"]`
		},
		{
			html: `<button id = "${this.modalId}-edit-btn" type="button" class="btn btn-sm btn-outline-secondary" onclick = "this.removeClicked ();">Remove</button>`,
			documentSelector: `hot-place-here[name="buttons"]`
		}]);
	}
}
