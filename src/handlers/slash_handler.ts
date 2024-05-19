import { rest } from "../main.js";
import {
	Routes,
	Client,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
	RESTPostAPIContextMenuApplicationCommandsJSONBody,
	Guild,
} from "discord.js";
import { readdirSync } from "fs";
import chalk from "chalk";
import SlashCommand from "../core/SlashCommand.js";
import UserContextMenu from "../core/UserContextMenu.js";

export default async function slashHandler(
	client: Client<true>,
	inDev = false,
	updateCommands = false
) {
	const mincoPenguinServer = (await client.guilds.fetch(
		process.env.TEST_SERVER_ID as string
	)) as Guild;
	const slashFiles = readdirSync(`./src/slash_commands`).filter(
		file => file.endsWith(".ts")
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
	(await Promise.all(commandPromises)).forEach(
		({ default: command }) => {
			const commandData = command.builder.toJSON();
			client["commands"].set(commandData.name, command);
			if (updateCommands)
				console.log(
					`${commandData.name} | dmp: ${commandData.default_member_permissions}`
				);
			data.push(commandData);
		}
	);
	console.log(
		`${chalk.green("commands set")} || command count: ${data.length}`
	);
	if (inDev) {
		await rest.put(
			Routes.applicationGuildCommands(
				client.user.id,
				mincoPenguinServer.id
			),
			{
				body: data,
			}
		);
	} else {
		await rest.put(Routes.applicationCommands(client.user.id), {
			body: data,
		});
	}
}
