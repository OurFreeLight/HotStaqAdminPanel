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
	 * The modal id.
	 */
	modalId: string;
	/**
	 * The hot-class attribute to pass to add to the modal's classes.
	 */
	class: string;
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
	/**
	 * What to execute when the save button is clicked.
	 */
	onsave: (modalType: string, values: any, selectedFields: any[]) => Promise<void>;
	/**
	 * What to execute when the edit button is clicked.
	 */
	onedit: (modalType: string, selectedFields: any[]) => Promise<boolean>;
	/**
	 * What to execute when the delete button is clicked.
	 */
	ondelete: (selectedField: any) => Promise<void>;

	constructor (copy: HotComponent | HotStaq, api: HotAPI)
	{
		super (copy, api);

		this.tag = "admin-edit";
		this.title = "";
		this.button_title = "";
		this.attached_list = "";
		this.schema = "";

		this.modalId = "";
		this.class = "";
		this.modal = null;
		this.modalType = "add";
		this.closeOnSave = true;
		this.selectedFields = [];
		this.onsave = null;
		this.onedit = null;
		this.ondelete = null;
	}

	/**
	 * Process the hot fields.
	 */
	async processHotFields (onField: (htmlElement: Element, field: { name: string; type: string; }) => Promise<void>): Promise<void>
	{
		const elms = this.htmlElements[1].querySelectorAll ("[hot-field]");

		for (let iIdx = 0; iIdx < elms.length; iIdx++)
		{
			const elm = elms[iIdx];
			const field = $(elm).attr ("hot-field");
			let fieldType = $(elm).attr ("hot-field-type");

			if ((fieldType == null) || (fieldType === ""))
				fieldType = "text";

			// @ts-ignore
			elm.fieldType = fieldType;

			await onField (elm, { name: field, type: fieldType });
		}
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

		await this.processHotFields (async (htmlElement: Element, field: { name: string; type: string; }) =>
			{
				$(htmlElement).val ("");
			});

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
			await this.processHotFields (async (htmlElement: Element, field: { name: string; type: string; }) =>
				{
					// @ts-ignore
					const value = selectedField[field.name];

					if (value != null)
						$(htmlElement).val (value);
				});

			this.selectedFields = [selectedField];

			if (this.onedit != null)
			{
				if (typeof (this.onedit) === "string")
					this.onedit = (<(modalType: string, selectedFields: any[]) => Promise<boolean>>new Function (this.onedit));

				let result = await this.onedit (this.modalType, this.selectedFields);

				if (result != null)
				{
					if (result === false)
						return;
				}
			}

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

					if (this.ondelete != null)
					{
						if (typeof (this.ondelete) === "string")
							this.ondelete = (<(selectedField: any) => Promise<void>>new Function (this.ondelete));

						await this.ondelete (whereField);
					}
					else
					{
						let removeUrl: string = Hot.Data.AdminPanel.removeUrl;

						await Hot.jsonRequest (removeUrl, {
								schema: this.schema,
								whereFields: whereField
							});
					}
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

		await this.processHotFields (async (htmlElement: Element, field: { name: string; type: string; }) =>
			{
				if (field.type === "remove")
					return;

				values[field.name] = $(htmlElement).val ();
			});

		if (this.onsave != null)
		{
			if (typeof (this.onsave) === "string")
				this.onsave = (<(modalType: string, values: any, selectedFields: any[]) => Promise<void>>new Function (this.onsave));

			await this.onsave (this.modalType, values, this.selectedFields);
		}
		else
		{
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

				let whereFields: any = {};

				await this.processHotFields (async (htmlElement: Element, field: { name: string; type: string; }) =>
					{
						if (field.type === "remove")
							return;

						whereFields[field.name] = $(htmlElement).val ();
					});

				let editUrl: string = Hot.Data.AdminPanel.editUrl;

				await Hot.jsonRequest (editUrl, {
						schema: this.schema,
						whereFields: whereFields,
						fields: values
					});
			}
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
			<div class="modal fade ${this.class}" id="${this.modalId}" tabindex="-1" aria-labelledby="${this.name}ModalLabel" aria-hidden="true">
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
			html: `<button id = "${this.modalId}-remove-btn" type="button" class="btn btn-sm btn-outline-secondary" onclick = "this.removeClicked ();">Remove</button>`,
			documentSelector: `hot-place-here[name="buttons"]`
		}]);
	}
}
