import { ActivityType, Client, GatewayIntentBits, REST, Events, RESTJSONErrorCodes, } from "discord.js";
import { config as loadenv } from "dotenv";
import chalk from "chalk";
import slashHandler from "./handlers/slash_handler.js";
import eventHandler from "./handlers/event_handler.js";
import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
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
    intents: GatewayIntentBits.Guilds |
        GatewayIntentBits.GuildMessages |
        GatewayIntentBits.MessageContent |
        GatewayIntentBits.GuildMembers,
});
const slashCommands = new Map();
// Map: channelId -> [[player1, player2], [player1]]
const bsPokerTeams = new Map();
const channelsWithActiveGames = new Set();
const readyEventName = "⏰ Ready Event";
client.once(Events.ClientReady, async (readyClient) => {
    console.time(readyEventName);
    await eventHandler(readyClient);
    await slashHandler(readyClient, updateCommands, inDev);
    console.log(`${chalk.green(readyClient.user.tag)} is online in ${chalk.blue(readyClient.guilds.cache.size)} servers!`);
    readyClient.user.setActivity("/bs_poker", {
        type: ActivityType.Listening,
    });
    console.timeEnd(readyEventName);
});
const errors = [
    RESTJSONErrorCodes.UnknownMessage,
    RESTJSONErrorCodes.UnknownInteraction,
    RESTJSONErrorCodes.UnknownChannel,
    RESTJSONErrorCodes.UnknownApplicationCommand,
    RESTJSONErrorCodes.UnknownGuild,
    RESTJSONErrorCodes.UnknownUser,
    RESTJSONErrorCodes.UnknownMember,
];
process.on("unhandledRejection", (err) => {
    if (errors.includes(err?.code)) {
        console.error("Unknown message/interaction.");
        return;
    }
    console.error(err);
});
const token = inDev ? process.env.CANARY_TOKEN : process.env.TOKEN;
const rest = new REST().setToken(token);
client.login(token);
export { rest, prisma, bsPokerTeams, channelsWithActiveGames, slashCommands };
//# sourceMappingURL=main.js.map