import { HotIO } from "hotstaq";
import * as ppath from "path";
import * as chokidar from "chokidar";

(async () =>
{
	function watchAndCopy (src: string, dest: string): void
	{
		chokidar.watch (src, { ignoreInitial: true })
			.on ("all", async (event, filePath) =>
				{
					if (event === 'change')
					{
						const fileName: string = ppath.basename (filePath);
						const fileExt: string = ppath.extname (filePath).toLowerCase ();
						const destPath: string = dest + '/' + fileName;

						if (fileExt === ".js")
						{
							await HotIO.copyFile (filePath, destPath);

							console.log (`${fileName} was copied to ${destPath}`);
						}
					}
				})
			.on ("error", (error) =>
				{
					console.error (`Error: ${error}`);
				});
	}

	if (await HotIO.exists (`${process.cwd ()}/assets/components/`) === false)
		await HotIO.mkdir (`${process.cwd ()}/assets/components/`);

	const src: string = `${process.cwd ()}/build/src/components/`;
	const dest: string = `${process.cwd ()}/assets/components/`;

	//watchAndCopy (src, dest);

	await HotIO.copyFiles (src, dest, {
		// @ts-ignore
		"filter": (src: string, dest: string) =>
		{
			const fileExt: string = ppath.extname (src).toLowerCase ();

			if (fileExt === "")
				return (true);

			if (fileExt === ".js")
			{
				console.log (`Copying ${src}`);
				return (true);
			}

			return (false);
		}
	});
	console.log (`${src} was copied to ${dest}`);
})();