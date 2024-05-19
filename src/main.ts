import {
	ActivityType,
	Client,
	Collection,
	Partials,
	GatewayIntentBits,
	REST,
} from "discord.js";
import { config as loadenv } from "dotenv";
import chalk from "chalk";
import slashHandler from "./handlers/slash_handler.js";
import eventHandler from "./handlers/event_handler.js";

const inDev = !process.argv.includes("--prod");
console.log(chalk.red(`In dev: ${inDev}`));
if (inDev) loadenv();

const client = new Client({
	intents:
		GatewayIntentBits.Guilds |
		GatewayIntentBits.GuildMessages |
		GatewayIntentBits.GuildMessageReactions |
		GatewayIntentBits.GuildMembers |
		GatewayIntentBits.GuildModeration |
		GatewayIntentBits.GuildEmojisAndStickers |
		GatewayIntentBits.GuildVoiceStates |
		GatewayIntentBits.GuildWebhooks |
		GatewayIntentBits.MessageContent,
	partials: [Partials.Channel, Partials.Message, Partials.Reaction],
});
(client as any).commands = new Collection();

const readyEventName = "⏰ Ready Event";
client.on("ready", async readyClient => {
	console.time(readyEventName);
	await eventHandler(readyClient);
	await slashHandler(readyClient, inDev);
	console.log(
		`${chalk.green(readyClient.user.tag)} is online in ${chalk.blue(
			readyClient.guilds.cache.size
		)} servers!`
	);
	setInterval(() => {
		readyClient.user.setActivity(
			`${readyClient.guilds.cache.size} servers`,
			{
				type: ActivityType.Listening,
			}
		);
	});
	console.timeEnd(readyEventName);
});

const token = process.env.TOKEN as string;
const rest = new REST().setToken(token);

client.login(token);

export { rest };
