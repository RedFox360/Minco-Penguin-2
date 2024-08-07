import { readdirSync } from "fs";
import { type Client } from "discord.js";
import chalk from "chalk";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

type EventPromises = Promise<{
	default: (client: Client<true>) => unknown;
}>[];

export default async function eventHandler(client: Client<true>) {
	const dir = dirname(fileURLToPath(import.meta.url));
	const eventsPath = path.join(dir, "..", "events");
	const eventFiles = readdirSync(eventsPath).filter(
		file => file.endsWith(".ts") || file.endsWith(".js")
	);
	const eventPromises: EventPromises = [];
	const eventNames: string[] = [];
	for (const file of eventFiles) {
		eventPromises.push(import(path.join(eventsPath, file)));
		const eventName = file.split(".")[0];
		eventNames.push(eventName);
		console.log(chalk.yellow(eventName));
	}
	const events = await Promise.all(eventPromises);
	for (const exports of events) {
		exports.default(client);
	}
	console.log(
		`${chalk.green("events loaded")} || event count: ${eventNames.length}`
	);
}
