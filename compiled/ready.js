import { ActivityType } from "discord.js";
import slashHandler from "./handlers/slash_handler.js";
import eventHandler from "./handlers/event_handler.js";
import chalk from "chalk";
const readyEventName = "⏰ Ready Event";
export default async function ready(client, updateCommands) {
    console.time(readyEventName);
    await eventHandler(client);
    await slashHandler(client, updateCommands);
    console.log(`${chalk.green(client.user.tag)} is online in ${chalk.blue(client.guilds.cache.size)} servers!`);
    client.user.setActivity("/bs_poker", {
        type: ActivityType.Listening,
    });
    console.timeEnd(readyEventName);
}
//# sourceMappingURL=ready.js.map