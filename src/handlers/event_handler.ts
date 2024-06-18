import { readdirSync } from "fs";
import { Client } from "discord.js";
import chalk from "chalk";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
export default async function eventHandler(client: Client) {
	const dir = dirname(fileURLToPath(import.meta.url));
	const eventsPath = path.join(dir, "..", "events");
	const eventFiles = readdirSync(eventsPath).filter(
		file => file.endsWith(".ts") || file.endsWith(".js")
	);
	const eventPromises: Array<
		Promise<{
			default: (client: Client) => unknown;
		}>
	> = [];
	const eventNames: Array<string> = [];
	for (const file of eventFiles) {
		eventPromises.push(import(path.join(eventsPath, file)));
		const eventName = file.split(".")[0];
		eventNames.push(eventName);
		console.log(chalk.yellow(eventName));
	}
	const events = await Promise.all(eventPromises);
	events.forEach(exports => exports.default(client));
	console.log(
		`${chalk.green("events loaded")} || event count: ${eventNames.length}`
	);
}
