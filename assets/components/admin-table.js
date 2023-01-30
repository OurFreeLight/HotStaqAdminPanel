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
exports.AdminTable = void 0;
var hotstaq_1 = require("hotstaq");
var AdminTable = /** @class */ (function (_super) {
    __extends(AdminTable, _super);
    function AdminTable(copy, api) {
        var _this = _super.call(this, copy, api) || this;
        /**
         * The headers are stored in a key/value object.
         *
         * @example { "name": "<th>Name</th>", "email": "<th>Email</th>" }
         */
        _this.headerElements = {};
        /**
         * The row elements are stored in an array with key/value fields and it's attached html element.
         *
         * @example
         * {
         *   "fields": [
         *       {
         *         "name": "John Smith",
         *         "email": "john.smith@test.com"
         *       }
         *     ],
         *   "html": "<tr><td>John Smith</td><td>john.smith@test.com</td></tr>"
         * }
         */
        _this.rowElements = [];
        _this.tag = "admin-table";
        _this.title = "";
        _this.schema = "";
        _this.headerElements = {};
        _this.headerIndicies = [];
        _this.rowElements = [];
        return _this;
    }
    /**
     * Add a header to the table.
     */
    AdminTable.prototype.addHeader = function (tableFieldElement) {
        var header = this.htmlElements[0].getElementsByTagName("thead")[0];
        // @ts-ignore
        this.headerIndicies.push(tableFieldElement.hotComponent.field);
        header.appendChild(tableFieldElement);
    };
    /**
     * Add a header to the table.
     */
    AdminTable.prototype.addHeaderDataOnly = function (tableField, htmlElement) {
        this.headerIndicies.push(tableField.field);
        this.headerElements[tableField.field] = htmlElement;
    };
    /**
     * Add a row to the table.
     *
     * @param {Array} fields A list of values to append.
     */
    AdminTable.prototype.addRow = function (fields) {
        var tbody = this.htmlElements[1].getElementsByTagName("tbody")[0];
        var rowStr = "<tr>";
        for (var iIdx = 0; iIdx < this.headerIndicies.length; iIdx++) {
            var key = this.headerIndicies[iIdx];
            var value = fields[key];
            if (this.headerElements[key] != null)
                rowStr += "<td>".concat(value, "</td>");
        }
        rowStr += "</tr>";
        hotstaq_1.HotStaq.addHtml(tbody, rowStr);
    };
    /**
     * Clear the list of rows.
     */
    AdminTable.prototype.clearRows = function () {
        return __awaiter(this, void 0, void 0, function () {
            var tbody;
            return __generator(this, function (_a) {
                tbody = this.htmlElements[1].getElementsByTagName("tbody")[0];
                tbody.innerHTML = "";
                return [2 /*return*/];
            });
        });
    };
    /**
     * Refresh the list.
     */
    AdminTable.prototype.refreshList = function () {
        return __awaiter(this, void 0, void 0, function () {
            var list, iIdx, fields;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, hotstaq_1.Hot.jsonRequest("".concat(hotstaq_1.Hot.Data.baseUrl, "/v1/data/list"), {
                            schema: this.schema
                        })];
                    case 1:
                        list = _a.sent();
                        this.clearRows();
                        for (iIdx = 0; iIdx < list.length; iIdx++) {
                            fields = list[iIdx];
                            this.addRow(fields);
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get the list of data from the server.
     */
    AdminTable.prototype.onPostPlace = function (parentHtmlElement, htmlElement) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.refreshList()];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); }, 50);
                return [2 /*return*/, (htmlElement)];
            });
        });
    };
    AdminTable.prototype.output = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, ("\n\t\t<div id = \"".concat(this.htmlElements[0].id, "\">\n\t\t\t<h2>").concat(this.title, "</h2>\n\t\t\t<div class=\"table-responsive\">\n\t\t\t<table class=\"table table-striped table-sm\">\n\t\t\t\t<thead hot-place-here = \"header\">\n\t\t\t\t</thead>\n\t\t\t\t<tbody hot-place-here = \"results\">\n\t\t\t\t</tbody>\n\t\t\t</table>\n\t\t\t</div>\n\t\t</div>"))];
            });
        });
    };
    return AdminTable;
}(hotstaq_1.HotComponent));
exports.AdminTable = AdminTable;
hotstaq_1.Hot.CurrentPage.processor.addComponent(AdminTable);
//# sourceMappingURL=admin-table.js.map