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
	 * The text for the add button.
	 */
	add_text: string;
	/**
	 * The location to put the add button.
	 */
	add_place_here: string;
	/**
	 * The text for the edit button.
	 */
	edit_text: string;
	/**
	 * The location to put the edit button.
	 */
	edit_place_here: string;
	/**
	 * The text for the remove button.
	 */
	remove_text: string;
	/**
	 * The location to put the remove button.
	 */
	remove_place_here: string;
	/**
	 * The hot-class attribute to pass to add to the modal's classes.
	 */
	css_class: string;
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
	 * What to execute when the save button is clicked. If this returns true, the modal will close.
	 * If this returns false, the modal will not close.
	 */
	onsave: (modalType: string, values: any, selectedFields: any[]) => Promise<boolean>;
	/**
	 * What to execute when the edit button is clicked.
	 */
	onadd: (modalType: string, selectedFields: any[]) => Promise<boolean>;
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
		this.button_title = "Save";
		this.attached_list = "";
		this.schema = "";

		this.modalId = "";
		this.add_text = "Add";
		this.add_place_here = "dashboardHeader";
		this.edit_text = "Edit";
		this.edit_place_here = "dashboardHeader";
		this.remove_text = "Remove";
		this.remove_place_here = "dashboardHeader";
		this.css_class = "";
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
	async processHotFields (onField: (htmlElement: Element, 
		field: { name: string; type: string; input: string; }) => Promise<void>): Promise<void>
	{
		const elms = this.htmlElements[1].querySelectorAll ("[hot-field]");

		for (let iIdx = 0; iIdx < elms.length; iIdx++)
		{
			const elm = elms[iIdx];
			const field = $(elm).attr ("hot-field");
			let fieldType = $(elm).attr ("hot-field-type");
			let fieldInput = $(elm).attr ("hot-field-input");

			if ((fieldType == null) || (fieldType === ""))
				fieldType = "text";

			// @ts-ignore
			elm.fieldType = fieldType;

			await onField (elm, { name: field, type: fieldType, input: fieldInput });
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
	async addClicked (selectedFields: any[] = []): Promise<void>
	{
		if (this.onAddClicked != null)
		{
			let result = await this.onAddClicked ();

			if (result === false)
				return;
		}

		this.modalType = "add";

		await this.processHotFields (
			async (htmlElement: Element, field: { name: string; type: string; }) =>
			{
				$(htmlElement).val ("");
			});

		this.selectedFields = selectedFields;

		if (this.onadd != null)
		{
			if (typeof (this.onadd) === "string")
				this.onadd = (<(modalType: string, selectedFields: any[]) => Promise<boolean>>new Function (this.onadd));

			let result = await this.onadd (this.modalType, this.selectedFields);

			if (result != null)
			{
				if (result === false)
					return;
			}
		}

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
	async editClicked (selectedFields: any[] = []): Promise<void>
	{
		if (this.onEditClicked != null)
		{
			let result = await this.onEditClicked ();

			if (result === false)
				return;
		}

		this.modalType = "edit";

		this.selectedFields = selectedFields;

		if (this.attached_list !== "")
		{
			let attachedList = document.getElementById (this.attached_list);

			// @ts-ignore
			let hotComponent: AdminTable = attachedList.hotComponent;
			hotComponent.attachedEdit = this;
			let selectedField = hotComponent.getSelected ();

			if (selectedField != null)
			{
				await this.processHotFields (
					async (htmlElement: Element, field: { name: string; type: string; input: string; }) =>
					{
						// @ts-ignore
						let value = selectedField[field.name];

						if (field.input != null)
						{
							if (field.input !== "")
							{
								let func = new Function (field.input);
								value = await func.call (this, value);
							}
						}

						if (value != null)
							$(htmlElement).val (value);
					});

				this.selectedFields = [selectedField];
			}
		}

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

		let whereFields: any[] = [];
		let hotComponent: AdminTable = null;

		if (this.attached_list !== "")
		{
			let attachedList = document.getElementById (this.attached_list);
			// @ts-ignore
			hotComponent = attachedList.hotComponent;
			hotComponent.attachedEdit = this;
			let checkedRows = hotComponent.getCheckedRows ();

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
		}

		const confirmed: boolean = confirm ("Are you sure you want to remove this item?");

		if (confirmed === true)
		{
			for (let i = 0; i < whereFields.length; i++)
			{
				let whereField = whereFields[i];

				if (hotComponent != null)
				{
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

			if (whereFields.length === 0)
			{
				if (this.ondelete != null)
				{
					if (typeof (this.ondelete) === "string")
						this.ondelete = (<(selectedField: any) => Promise<void>>new Function (this.ondelete));

					await this.ondelete (null);
				}
				else
				{
					let removeUrl: string = Hot.Data.AdminPanel.removeUrl;

					await Hot.jsonRequest (removeUrl, {
							schema: this.schema,
							whereFields: null
						});
				}
			}
	
			if (hotComponent != null)
				await hotComponent.refreshList ();
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

				let value = $(htmlElement).val ();

				if ($(htmlElement).attr ("hot-value") != null)
					value = $(htmlElement).attr ("hot-value");

				if (field.type === "array")
				{
					if (values[field.name] == null)
						values[field.name] = [];

					values[field.name].push (value);

					return;
				}

				values[field.name] = value;
			});

		if (this.onsave != null)
		{
			if (typeof (this.onsave) === "string")
				this.onsave = (<(modalType: string, values: any, selectedFields: any[]) => Promise<boolean>>new Function (this.onsave));

			let result = await this.onsave (this.modalType, values, this.selectedFields);

			if (result === false)
				return;
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
		
						let value = $(htmlElement).val ();
		
						if ($(htmlElement).attr ("hot-value") != null)
							value = $(htmlElement).attr ("hot-value");
		
						if (field.type === "array")
						{
							if (whereFields[field.name] == null)
								whereFields[field.name] = [];
		
							whereFields[field.name].push (value);
		
							return;
						}
		
						whereFields[field.name] = value;
					});

				let editUrl: string = Hot.Data.AdminPanel.editUrl;

				await Hot.jsonRequest (editUrl, {
						schema: this.schema,
						whereFields: whereFields,
						fields: values
					});
			}
		}

		if (this.attached_list !== "")
		{
			let attachedList = document.getElementById (this.attached_list);
			// @ts-ignore
			let table: AdminTable = attachedList.hotComponent;

			table.attachedEdit = this;

			await table.refreshList ();
		}

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

		/// @todo Fix this temporary hack. I dont like it.
		setTimeout (() =>
			{
				if (this.attached_list !== "")
				{
					let attachedList = document.getElementById (this.attached_list);
					// @ts-ignore
					let table: AdminTable = attachedList.hotComponent;

					if (table != null)
						table.attachedEdit = this;
				}
			}, 50);

		return (null);
	}

	output (): string | HotComponentOutput[]
	{
		if (this.name === "")
			throw new Error (`You must specify a name for each admin-edit element!`);

		this.modalId = `${this.name}Modal`;

		let outputObj = [{
			html: `
			<!-- ${this.title} Modal Start -->
			<div class="modal fade ${this.css_class}" id="${this.modalId}" tabindex="-1" aria-labelledby="${this.name}ModalLabel" aria-hidden="true">
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
		}];

		if (this.add_place_here !== "")
		{
			outputObj.push ({
				html: `<button id = "${this.modalId}-add-btn" type="button" class="btn btn-sm btn-outline-secondary" onclick = "this.addClicked ();">${this.add_text}</button>`,
				documentSelector: `hot-place-here[name="${this.add_place_here}"]`
			});
		}

		if (this.edit_place_here !== "")
		{
			outputObj.push ({
				html: `<button id = "${this.modalId}-edit-btn" type="button" class="btn btn-sm btn-outline-secondary" onclick = "this.editClicked ();">${this.edit_text}</button>`,
				documentSelector: `hot-place-here[name="${this.edit_place_here}"]`
			});
		}

		if (this.remove_place_here !== "")
		{
			outputObj.push ({
				html: `<button id = "${this.modalId}-remove-btn" type="button" class="btn btn-sm btn-outline-secondary" onclick = "this.removeClicked ();">${this.remove_text}</button>`,
				documentSelector: `hot-place-here[name="${this.remove_place_here}"]`
			});
		}

		return (outputObj);
	}
}
