import { readdirSync } from "fs";
import { Client } from "discord.js";
import chalk from "chalk";
export default async function eventHandler(client: Client) {
	const eventFiles = readdirSync(`./src/events`).filter(file =>
		file.endsWith(".ts")
	);
	const eventPromises: Array<
		Promise<{
			default: (client: Client) => unknown;
		}>
	> = [];
	const eventNames: Array<string> = [];
	for (const file of eventFiles) {
		eventPromises.push(import(`../events/${file}`));
		eventNames.push(file.split(".")[0]);
	}
	const events = await Promise.all(eventPromises);
	events.forEach(exports => exports.default(client));
	console.log(`${chalk.yellow(events.length)} events loaded`);
}
