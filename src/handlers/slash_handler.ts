import { inDev, rest, slashCommands } from "../main.js";
import {
	Routes,
	type Client,
	type RESTPostAPIChatInputApplicationCommandsJSONBody,
	type RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from "discord.js";
import { readdirSync } from "fs";
import chalk from "chalk";
import type SlashCommand from "../core/SlashCommand.js";
import type UserContextMenu from "../core/UserContextMenu.js";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

type CommandPromises = Promise<{ default: SlashCommand | UserContextMenu }>[];
type CommandData = (
	| RESTPostAPIChatInputApplicationCommandsJSONBody
	| RESTPostAPIContextMenuApplicationCommandsJSONBody
)[];

export default async function slashHandler(
	client: Client<true>,
	updateCommands = false
) {
	const dir = dirname(fileURLToPath(import.meta.url));
	const slashPath = path.join(dir, "..", "slash_commands");
	const slashFiles = readdirSync(slashPath).filter(
		file => file.endsWith(".ts") || file.endsWith(".js")
	);
	const commandPromises: CommandPromises = [];
	const data: CommandData = [];
	for (const fileName of slashFiles) {
		commandPromises.push(import(path.join(slashPath, fileName)));
	}
	const commands = await Promise.all(commandPromises);
	for (const { default: command } of commands) {
		const commandData = command.builder.toJSON();
		slashCommands.set(commandData.name, command);
		let logMsg = `${chalk.blue(commandData.name)}`;
		if (commandData.default_member_permissions) {
			logMsg += ` | dmp: ${commandData.default_member_permissions}`;
		}
		console.log(logMsg);
		data.push(commandData);
	}
	console.log(
		`${chalk.green("commands set")} || command count: ${data.length}`
	);
	if (!updateCommands) return;
	console.log(chalk.yellow("Updating commands..."));

	if (inDev) {
		await rest.put(
			Routes.applicationGuildCommands(client.user.id, "999133276478373919"),
			{
				body: data,
			}
		);
		console.log(chalk.green("Commands updated in dev!"));
	}
	await rest.put(Routes.applicationCommands(client.user.id), {
		body: data,
	});
	console.log(chalk.green("Commands updated globally!"));
}
