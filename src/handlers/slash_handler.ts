import { rest, slashCommands } from "../main.js";
import {
	Routes,
	Client,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
	RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from "discord.js";
import { readdirSync } from "fs";
import chalk from "chalk";
import SlashCommand from "../core/SlashCommand.js";
import UserContextMenu from "../core/UserContextMenu.js";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

export default async function slashHandler(
	client: Client<true>,
	updateCommands = false,
	inDev = false
) {
	const dir = dirname(fileURLToPath(import.meta.url));
	const slashPath = path.join(dir, "..", "slash_commands");
	const slashFiles = readdirSync(slashPath).filter(
		file => file.endsWith(".ts") || file.endsWith(".js")
	);
	const commandPromises: Array<
		Promise<{ default: SlashCommand | UserContextMenu }>
	> = [];
	const data: (
		| RESTPostAPIChatInputApplicationCommandsJSONBody
		| RESTPostAPIContextMenuApplicationCommandsJSONBody
	)[] = [];
	slashFiles.forEach(fileName => {
		commandPromises.push(import(path.join(slashPath, fileName)));
	});
	(await Promise.all(commandPromises)).forEach(({ default: command }) => {
		const commandData = command.builder.toJSON();
		slashCommands.set(commandData.name, command);
		let logMsg = `${chalk.blue(commandData.name)}`;
		if (commandData.default_member_permissions) {
			logMsg += ` | dmp: ${commandData.default_member_permissions}`;
		}
		console.log(logMsg);
		data.push(commandData);
	});
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
	}
	await rest.put(Routes.applicationCommands(client.user.id), {
		body: data,
	});
}
