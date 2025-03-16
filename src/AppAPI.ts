import { HotAPI, HotServer, HotClient, MySQLSchema, HotServerType, HotDBMySQL, HotLog, ServerRequest} from "hotstaq";
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

		this.onPreRegister = async (): Promise<boolean> =>
			{
				if (connection.type !== HotServerType.Generate)
				{
					this.setDBSchema (new MySQLSchema (process.env["DATABASE_SCHEMA"]));
				}

				return (true);
			};
		this.onPostRegister = async (): Promise<boolean> =>
			{
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

		this.addRoute (new UserRoute (this, "users"));
		this.addRoute (new FriendlyAdminRoute (this, "admins"));
	}
}