import { rest } from "../main.js";
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

export default async function slashHandler(
	client: Client<true>,
	updateCommands = false
) {
	const slashFiles = readdirSync(`./src/slash_commands`).filter(file =>
		file.endsWith(".ts")
	);
	const commandPromises: Array<
		Promise<{ default: SlashCommand | UserContextMenu }>
	> = [];
	const data: (
		| RESTPostAPIChatInputApplicationCommandsJSONBody
		| RESTPostAPIContextMenuApplicationCommandsJSONBody
	)[] = [];
	slashFiles.forEach(fileName => {
		commandPromises.push(import(`../slash_commands/${fileName}`));
	});
	(await Promise.all(commandPromises)).forEach(({ default: command }) => {
		const commandData = command.builder.toJSON();
		client["commands"].set(commandData.name, command);
		console.log(
			`${chalk.blue(commandData.name)} | dmp: ${
				commandData.default_member_permissions
			}`
		);
		if (updateCommands) data.push(commandData);
	});
	console.log(
		`${chalk.green("commands set")} || command count: ${data.length}`
	);
	if (!updateCommands) return;
	console.log(chalk.yellow("Updating commands..."));
	await rest.put(Routes.applicationCommands(client.user.id), {
		body: data,
	});
}
