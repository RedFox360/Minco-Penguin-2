import { readdirSync } from "fs";
import chalk from "chalk";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
export default async function eventHandler(client) {
    const dir = dirname(fileURLToPath(import.meta.url));
    const eventsPath = path.join(dir, "..", "events");
    const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith(".ts") || file.endsWith(".js"));
    const eventPromises = [];
    const eventNames = [];
    for (const file of eventFiles) {
        eventPromises.push(import(path.join(eventsPath, file)));
        const eventName = file.split(".")[0];
        eventNames.push(eventName);
        console.log(chalk.yellow(eventName));
    }
    const events = await Promise.all(eventPromises);
    events.forEach(exports => exports.default(client));
    console.log(`${chalk.green("events loaded")} || event count: ${eventNames.length}`);
}
//# sourceMappingURL=event_handler.js.map