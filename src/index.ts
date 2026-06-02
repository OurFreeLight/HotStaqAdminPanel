import { AdminButton } from "./components/admin-button";
import { AdminDropdown } from "./components/admin-dropdown";
import { AdminDashboard } from "./components/admin-dashboard";
import { AdminEdit } from "./components/admin-edit";
import { AdminTable } from "./components/admin-table";
import { AdminTableField } from "./components/admin-table-field";
import { AdminTableRow } from "./components/admin-table-row";
import { AdminText } from "./components/admin-text";

// admin-panel 0.4.0 — Freelight-style components. Backwards compatible
// with the existing modal/table set above; pages opt in by switching
// their .hott templates to use the new tags.
import { AdminFormField } from "./components/admin-form-field";
import { AdminAddPanel } from "./components/admin-add-panel";
import { AdminCardTable } from "./components/admin-card-table";
import { AdminDetailPage } from "./components/admin-detail-page";
import { AdminDisclaimer } from "./components/admin-disclaimer";
import { AdminEyebrowHeading } from "./components/admin-eyebrow-heading";
import { AdminRowEdit } from "./components/admin-row-edit";

// admin-panel 0.5.0 — composite field components for detail pages
// (rich-text, related-entity picker, approval/moderation panel).
import { AdminRichText } from "./components/admin-rich-text";
import { AdminRelatedPicker } from "./components/admin-related-picker";
import { AdminApprovalPanel } from "./components/admin-approval-panel";

// admin-panel 0.5.6 — multi-section layout + file upload field.
import { AdminTabPage } from "./components/admin-tab-page";
import { AdminTab } from "./components/admin-tab";
import { AdminFileUpload } from "./components/admin-file-upload";

export {
		AdminButton,
		AdminDropdown,
		AdminDashboard,
		AdminEdit,
		AdminTable,
		AdminTableField,
		AdminTableRow,
		AdminText,
		AdminFormField,
		AdminAddPanel,
		AdminCardTable,
		AdminDetailPage,
		AdminDisclaimer,
		AdminEyebrowHeading,
		AdminRowEdit,
		AdminRichText,
		AdminRelatedPicker,
		AdminApprovalPanel,
		AdminTabPage,
		AdminTab,
		AdminFileUpload
	};
