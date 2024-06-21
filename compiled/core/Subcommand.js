import { SlashCommandSubcommandBuilder } from "discord.js";
export default class Subcommand {
    get builder() {
        return this._builder;
    }
    setCommandData(builder) {
        const slashBuilder = builder(new SlashCommandSubcommandBuilder());
        if (!(slashBuilder instanceof SlashCommandSubcommandBuilder)) {
            throw new Error(`${this._builder.name} Builder provided is not an instance of SlashCommandBuilder`);
        }
        this._builder = slashBuilder;
        return this;
    }
    get run() {
        return this._run;
    }
    setRun(runFunction) {
        this._run = runFunction;
        return this;
    }
}
//# sourceMappingURL=Subcommand.js.map