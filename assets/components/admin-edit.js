"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminEdit = void 0;
var hotstaq_1 = require("hotstaq");
var AdminEdit = /** @class */ (function (_super) {
    __extends(AdminEdit, _super);
    function AdminEdit(copy, api) {
        var _this = _super.call(this, copy, api) || this;
        _this.tag = "admin-edit";
        _this.title = "";
        _this.button_title = "";
        _this.attached_list = "";
        _this.schema = "";
        _this.fieldElements = {};
        _this.modalId = "";
        return _this;
    }
    /**
     * Save this form.
     */
    AdminEdit.prototype.onSave = function () {
        return __awaiter(this, void 0, void 0, function () {
            var values, key, fieldElement, value, attachedList;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        values = {};
                        for (key in this.fieldElements) {
                            fieldElement = this.fieldElements[key];
                            value = fieldElement.value;
                            values[key] = value;
                        }
                        return [4 /*yield*/, hotstaq_1.Hot.jsonRequest("".concat(hotstaq_1.Hot.Data.baseUrl, "/v1/data/add"), {
                                schema: this.schema,
                                fields: values
                            })];
                    case 1:
                        _a.sent();
                        attachedList = document.getElementById(this.attached_list);
                        // @ts-ignore
                        return [4 /*yield*/, attachedList.hotComponent.refreshList()];
                    case 2:
                        // @ts-ignore
                        _a.sent();
                        // @ts-ignore
                        $("#".concat(this.modalId)).modal("hide");
                        return [2 /*return*/];
                }
            });
        });
    };
    AdminEdit.prototype.output = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.name === "")
                    throw new Error("You must specify a name for each admin-edit element!");
                this.modalId = "".concat(this.name, "Modal");
                return [2 /*return*/, ([{
                            html: "\n\t\t\t<!-- ".concat(this.title, " Modal Start -->\n\t\t\t<div class=\"modal fade\" id=\"").concat(this.modalId, "\" tabindex=\"-1\" aria-labelledby=\"").concat(this.name, "ModalLabel\" aria-hidden=\"true\">\n\t\t\t\t<div class=\"modal-dialog\">\n\t\t\t\t\t<div class=\"modal-content\">\n\t\t\t\t\t<div class=\"modal-header\">\n\t\t\t\t\t\t<h5 class=\"modal-title\" id=\"").concat(this.name, "ModalLabel\">").concat(this.title, "</h5>\n\t\t\t\t\t\t<button type=\"button\" class=\"btn-close\" data-bs-dismiss=\"modal\" aria-label=\"Close\"></button>\n\t\t\t\t\t</div>\n\t\t\t\t\t<div class=\"modal-body\">\n\t\t\t\t\t\t<hot-place-here name = \"modalBody\" type = \"modal\"></hot-place-here>\n\t\t\t\t\t</div>\n\t\t\t\t\t<div class=\"modal-footer\">\n\t\t\t\t\t\t<button type=\"button\" class=\"btn btn-secondary\" data-bs-dismiss=\"modal\">Cancel</button>\n\t\t\t\t\t\t<button type=\"button\" class=\"btn btn-primary\" onclick = \"document.getElementById('").concat(this.modalId, "').onSave ();\">").concat(this.button_title, "</button>\n\t\t\t\t\t</div>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t\t<!-- ").concat(this.title, " Modal End -->"),
                            parentSelector: "body"
                        },
                        {
                            html: "<button type=\"button\" class=\"btn btn-sm btn-outline-secondary\" data-bs-toggle=\"modal\" onclick = \"$('#".concat(this.modalId, "').modal ('show');\">Add</button>"),
                            parentSelector: "hot-place-here[name=\"buttons\"]"
                        }])];
            });
        });
    };
    return AdminEdit;
}(hotstaq_1.HotComponent));
exports.AdminEdit = AdminEdit;
hotstaq_1.Hot.CurrentPage.processor.addComponent(AdminEdit);
//# sourceMappingURL=admin-edit.js.map