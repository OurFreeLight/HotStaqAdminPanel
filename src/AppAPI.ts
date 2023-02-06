import { HotAPI, HotServer, HotClient, HotRoute, 
	HotRouteMethod, MySQLSchema, 
	ServerAuthorizationFunction, HotStaq, HotServerType, DeveloperMode, HotDBMySQL } from "hotstaq";
import { DataRoute } from "@hotstaq/dataroute";

/**
 * The App's API and routes.
 */
export class AppAPI extends HotAPI
{
	constructor (baseUrl: string, connection: HotServer | HotClient, db: any = null)
	{
		super(baseUrl, connection, db);

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
				// Sync database tables here.

				return (true);
			};

		this.addRoute (new DataRoute (this, async (db: HotDBMySQL) =>
			{
				if (this.connection.processor.mode === DeveloperMode.Development)
				{
					await db.query (
						`create table if not exists users (
							id             INT(10)        NOT NULL AUTO_INCREMENT,
							name           VARCHAR(256)   DEFAULT '',
							email          VARCHAR(256)   DEFAULT '',
							password       VARCHAR(256)   DEFAULT '',
							verified       INT(1)         DEFAULT '0',
							registered     DATETIME       DEFAULT NOW(),
							enabled        INT(1)         DEFAULT '1',
							PRIMARY KEY (id)
						)`);

					let results: any = await db.queryOne (`select COUNT(*) from users;`);

					if (results.results["COUNT(*)"] < 1)
					{
						let testUsers = [{
									name: "John",
									email: "test1@freelight.org",
									password: "a867h398jdg",
									verified: true
								},
								{
									name: "Jane",
									email: "test2@freelight.org",
									password: "ai97w3a98w3498",
									verified: true
								}
							];

						for (let iIdx = 0; iIdx < testUsers.length; iIdx++)
						{
							let testUser = testUsers[iIdx];
							let verified: number = 0;

							if (testUser.verified === true)
								verified = 1;

							let result: any = await db.query (
								`INSERT INTO users (name, email, password, verified) VALUES (?, ?, ?, ?);`, 
								[testUser.name, testUser.email, testUser.password, verified]);

							if (result.error != null)
								throw new Error (result.error);

							let id: number = result.results["insertId"];
						}
					}
				}
			}));
	}
}