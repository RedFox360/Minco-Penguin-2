import {
	type Snowflake,
	Client,
	GatewayIntentBits,
	REST,
	Events,
	RESTJSONErrorCodes,
	Collection,
} from "discord.js";
import { config as loadenv } from "dotenv";
import chalk from "chalk";
import { PrismaClient } from "@prisma/client";
import SlashCommand from "./core/SlashCommand.js";
import UserContextMenu from "./core/UserContextMenu.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import ready from "./ready.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Los_Angeles");

const prisma = new PrismaClient();

console.log(chalk.yellow("Connected to the database!"));
const inDev = !process.argv.includes("--prod");
const updateCommands = process.argv.includes("--update");
console.log(chalk.red(`In dev: ${inDev}`));
loadenv();

const client = new Client({
	intents:
		GatewayIntentBits.Guilds |
		GatewayIntentBits.GuildMessages |
		GatewayIntentBits.MessageContent |
		GatewayIntentBits.GuildMembers,
});

// Map: channelId -> [[player1, player2], [player1]]
const bsPokerTeams = new Map<Snowflake, Snowflake[][]>();
// Map: command name -> Command object
const slashCommands = new Map<string, SlashCommand | UserContextMenu>();
const channelsWithActiveGames = new Set<Snowflake>();

client.once(Events.ClientReady, async readyClient => {
	ready(readyClient, updateCommands);
});

const errors = [
	RESTJSONErrorCodes.UnknownMessage,
	RESTJSONErrorCodes.UnknownInteraction,
	RESTJSONErrorCodes.UnknownChannel,
	RESTJSONErrorCodes.UnknownApplicationCommand,
	RESTJSONErrorCodes.UnknownGuild,
	RESTJSONErrorCodes.UnknownUser,
	RESTJSONErrorCodes.UnknownMember,
] as const;

process.on("unhandledRejection", (err: any) => {
	if (errors.includes(err?.code)) {
		console.log("Unknown message/interaction.");
		return;
	}
	console.error(err);
});

const token = inDev ? process.env.CANARY_TOKEN : process.env.TOKEN;
const rest = new REST().setToken(token);

client.login(token);

export {
	rest,
	prisma,
	bsPokerTeams,
	channelsWithActiveGames,
	slashCommands,
	inDev,
};
