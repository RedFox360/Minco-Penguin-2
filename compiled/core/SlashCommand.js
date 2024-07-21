import { SlashCommandBuilder, } from "discord.js";
import { cooldownMax, cooldownMin, } from "./util_types.js";
export default class SlashCommand {
    constructor() {
        this._cooldown = 0;
        this._botPermissions = [];
        this._builder = new SlashCommandBuilder().setDMPermission(false);
    }
    get builder() {
        return this._builder;
    }
    setCommandData(builder) {
        const slashBuilder = builder(this._builder);
        if (!(slashBuilder instanceof SlashCommandBuilder)) {
            throw new Error(`${this._builder.name}: Builder provided is not an instance of SlashCommandBuilder`);
        }
        this._builder = slashBuilder;
        return this;
    }
    get cooldown() {
        return this._cooldown;
    }
    setCooldown(seconds) {
        if (seconds >= cooldownMax || seconds <= cooldownMin) {
            throw new Error(`${this._builder.name}: Cooldown must be between ${cooldownMin} and ${cooldownMax} seconds.`);
        }
        this._cooldown = seconds * 1000;
        return this;
    }
    get run() {
        return this._run;
    }
    setRun(runFunction) {
        this._run = runFunction;
        return this;
    }
    get autocomplete() {
        return this._autocomplete;
    }
    setAutocomplete(autocompleteFunction) {
        this._autocomplete = autocompleteFunction;
        return this;
    }
    get botPermissions() {
        return this._botPermissions;
    }
    setBotPermissions(...permissions) {
        this._botPermissions = permissions;
        return this;
    }
}
//# sourceMappingURL=SlashCommand.js.map