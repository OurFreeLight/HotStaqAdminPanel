import { HotAPI, HotServer, HotClient, MySQLSchema, HotServerType, HotDBMySQL, HotLog, ServerRequest,
	HotRoute, HotEventMethod, HotStaq } from "hotstaq";
import { AdminRoute, User, UserRoute } from "@hotstaq/userroute";

/**
 * An admin route that can be used for any user.
 */
export class FriendlyAdminRoute extends AdminRoute
{
	constructor (api: HotAPI, routeName: string = "admins")
	{
		super (api, routeName);
	}

	/**
	 * This disables the need to check for authentication.
	 */
	protected async checkAuth (req: ServerRequest): Promise<void>
	{
	}
}

/**
 * In-memory test data routes that back the component testbed pages in
 * `public/test/`. No database, no auth — these exist purely so the
 * frontend components (admin-card-table, admin-row-edit, etc.) have
 * real endpoints to POST against during HotTesterMochaSelenium runs.
 * Mounted only when DATABASE_DISABLE=1 (test mode).
 */
export class TestStubRoute extends HotRoute
{
	private items: any[];
	private people: any[];
	private nextId: number;

	constructor (api: HotAPI, routeName: string = "items")
	{
		super (api.connection, routeName);

		this.nextId = 100;
		this.items = [
			{ id: "i-001", name: "Alpha",   status: "AwaitingReview",  priority: 1, description: "First item",  enabled: true,  createdAt: "2026-01-01" },
			{ id: "i-002", name: "Bravo",   status: "InReview",        priority: 2, description: "Second item", enabled: true,  createdAt: "2026-01-02" },
			{ id: "i-003", name: "Charlie", status: "Approved",        priority: 3, description: "Third item",  enabled: false, createdAt: "2026-01-03" },
			{ id: "i-004", name: "Delta",   status: "Rejected",        priority: 4, description: "Fourth item", enabled: true,  createdAt: "2026-01-04" },
			{ id: "i-005", name: "Echo",    status: "RequestChanges",  priority: 5, description: "Fifth item",  enabled: true,  createdAt: "2026-01-05" }
		];
		this.people = [
			{ id: "p-001", name: "Alice Anderson",   email: "alice@example.com",   role: "engineer" },
			{ id: "p-002", name: "Bob Brown",        email: "bob@example.com",     role: "designer" },
			{ id: "p-003", name: "Carol Carter",     email: "carol@example.com",   role: "engineer" },
			{ id: "p-004", name: "Dave Davis",       email: "dave@example.com",    role: "manager"  },
			{ id: "p-005", name: "Eve Evans",        email: "eve@example.com",     role: "engineer" }
		];

		this.addMethod ({
			"name": "list",
			"type": HotEventMethod.POST,
			"onServerExecute": async (req: ServerRequest): Promise<any> =>
				{
					const search: string = (HotStaq.getParamUnsafe ("search", req.jsonObj, false, false) || "").toLowerCase ();
					const offset: number = parseInt (HotStaq.getParamUnsafe ("offset", req.jsonObj, false, false) || 0, 10);
					const limit:  number = parseInt (HotStaq.getParamUnsafe ("limit",  req.jsonObj, false, false) || 50, 10);
					const filtered = search ? this.items.filter (x => x.name.toLowerCase ().indexOf (search) >= 0) : this.items;
					return ({ length: filtered.length, data: filtered.slice (offset, offset + limit) });
				}
		});

		this.addMethod ({
			"name": "get",
			"type": HotEventMethod.POST,
			"onServerExecute": async (req: ServerRequest): Promise<any> =>
				{
					const id: string = HotStaq.getParamUnsafe ("id", req.jsonObj, false, false);
					const found = this.items.find (x => x.id === id);
					if (found == null) return ({ error: "not found" });
					return (found);
				}
		});

		this.addMethod ({
			"name": "edit",
			"type": HotEventMethod.POST,
			"onServerExecute": async (req: ServerRequest): Promise<any> =>
				{
					const wrapped: any = HotStaq.getParamUnsafe ("item", req.jsonObj, false, false) || req.jsonObj;
					const id: string = wrapped.id;
					if (!id) return ({ error: "id required" });
					const idx = this.items.findIndex (x => x.id === id);
					if (idx < 0) return ({ error: "not found" });
					this.items[idx] = { ...this.items[idx], ...wrapped };
					return ({ ok: true, item: this.items[idx] });
				}
		});

		this.addMethod ({
			"name": "create",
			"type": HotEventMethod.POST,
			"onServerExecute": async (req: ServerRequest): Promise<any> =>
				{
					const wrapped: any = HotStaq.getParamUnsafe ("item", req.jsonObj, false, false) || req.jsonObj;
					const id = `i-${String (this.nextId++).padStart (3, "0")}`;
					const created = { id, status: "AwaitingReview", priority: 0, ...wrapped };
					this.items.unshift (created);
					return ({ ok: true, item: created });
				}
		});

		this.addMethod ({
			"name": "delete",
			"type": HotEventMethod.POST,
			"onServerExecute": async (req: ServerRequest): Promise<any> =>
				{
					const id: string = HotStaq.getParamUnsafe ("id", req.jsonObj, false, false);
					this.items = this.items.filter (x => x.id !== id);
					return ({ ok: true });
				}
		});

		this.addMethod ({
			"name": "setApprovalStatus",
			"type": HotEventMethod.POST,
			"onServerExecute": async (req: ServerRequest): Promise<any> =>
				{
					const id: string = HotStaq.getParamUnsafe ("id", req.jsonObj, false, false);
					const status: string = HotStaq.getParamUnsafe ("approvalStatus", req.jsonObj, false, false);
					const idx = this.items.findIndex (x => x.id === id);
					if (idx >= 0) this.items[idx].status = status;
					return ({ ok: true });
				}
		});

		this.addMethod ({
			"name": "setFlag",
			"type": HotEventMethod.POST,
			"onServerExecute": async (req: ServerRequest): Promise<any> =>
				{
					return ({ ok: true });
				}
		});
	}
}

/**
 * Stub route for related-picker — search + listing of people.
 */
export class PeopleStubRoute extends HotRoute
{
	private people: any[];

	constructor (api: HotAPI, routeName: string = "people")
	{
		super (api.connection, routeName);

		this.people = [
			{ id: "p-001", name: "Alice Anderson", email: "alice@example.com" },
			{ id: "p-002", name: "Bob Brown",      email: "bob@example.com"   },
			{ id: "p-003", name: "Carol Carter",   email: "carol@example.com" },
			{ id: "p-004", name: "Dave Davis",     email: "dave@example.com"  },
			{ id: "p-005", name: "Eve Evans",      email: "eve@example.com"   },
			{ id: "p-006", name: "Frank Fisher",   email: "frank@example.com" }
		];

		this.addMethod ({
			"name": "list",
			"type": HotEventMethod.POST,
			"onServerExecute": async (req: ServerRequest): Promise<any> =>
				{
					const search: string = (HotStaq.getParamUnsafe ("search", req.jsonObj, false, false) || "").toLowerCase ();
					const filtered = search
						? this.people.filter (p => p.name.toLowerCase ().indexOf (search) >= 0)
						: this.people;
					return ({ length: filtered.length, data: filtered });
				}
		});

		this.addMethod ({
			"name": "get",
			"type": HotEventMethod.POST,
			"onServerExecute": async (req: ServerRequest): Promise<any> =>
				{
					const id: string = HotStaq.getParamUnsafe ("id", req.jsonObj, false, false);
					const found = this.people.find (p => p.id === id);
					return (found || { error: "not found" });
				}
		});
	}
}

/**
 * Stub route for admin-file-upload's two-phase save flow.
 */
export class UploadsStubRoute extends HotRoute
{
	constructor (api: HotAPI, routeName: string = "uploads")
	{
		super (api.connection, routeName);

		this.addMethod ({
			"name": "save",
			"type": HotEventMethod.POST,
			"onServerExecute": async (req: ServerRequest): Promise<any> =>
				{
					// Phase 1 (multipart) returns an uploadId; phase 2 (JSON with
					// hotstaq.uploads.uploadId) returns the saved record. The
					// component just needs both to be 2xx with the right shape.
					if (req.req.headers && req.req.headers["hotstaquplaod"] === "true")
						return ({ hotstaq: { uploads: { uploadId: "u-test-12345" } } });
					if (req.req.headers && req.req.headers["hotstaqupload"] === "true")
						return ({ hotstaq: { uploads: { uploadId: "u-test-12345" } } });
					return ({ ok: true });
				}
		});
	}
}

/**
 * The App's API and routes.
 */
export class AppAPI extends HotAPI
{
	/**
	 * The logger.
	 */
	logger: HotLog;
	/**
	 * The database connection.
	 */
	db: HotDBMySQL;

	constructor (baseUrl: string, connection: HotServer | HotClient, db: HotDBMySQL = null)
	{
		super(baseUrl, connection, db);

		this.logger = connection.logger;

		const dbDisabled: boolean = process.env["DATABASE_DISABLE"] === "1";

		this.onPreRegister = async (): Promise<boolean> =>
			{
				if (!dbDisabled && connection.type !== HotServerType.Generate)
					this.setDBSchema (new MySQLSchema (process.env["DATABASE_SCHEMA"]));

				return (true);
			};
		this.onPostRegister = async (): Promise<boolean> =>
			{
				if (dbDisabled)
				{
					this.logger.info (`DATABASE_DISABLE=1 — skipping User table sync + seed users (test mode).`);
					return (true);
				}

				await User.syncTables (this.db, true);

				const maxUsers: number = 53;

				for (let iIdx = 0; iIdx < maxUsers; iIdx++)
				{
					try
					{
						let testUser = new User ({
								displayName: `John${iIdx}`,
								email: `test${iIdx}@freelight.org`,
								password: "a867h398jdg",
								verified: ((iIdx % 2) === 0) ? true : false
							});

						await testUser.register (this.db);
						this.logger.info (`Registered user: ${testUser.displayName}`);
					}
					catch (ex)
					{
						this.logger.error (`Error registering user: ${ex}`);
					}
				}

				return (true);
			};

		if (!dbDisabled)
		{
			this.addRoute (new UserRoute (this, "users"));
			this.addRoute (new FriendlyAdminRoute (this, "admins"));
		}

		// Test stub routes — only in DATABASE_DISABLE mode so the testbed
		// pages in public/test/ can fetch real responses without a DB.
		if (dbDisabled)
		{
			this.addRoute (new TestStubRoute (this, "items"));
			this.addRoute (new PeopleStubRoute (this, "people"));
			this.addRoute (new UploadsStubRoute (this, "uploads"));
		}
	}
}
