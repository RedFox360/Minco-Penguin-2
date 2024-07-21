import {
	SharedSlashCommand,
	SlashCommandBuilder,
	type PermissionResolvable,
} from "discord.js";
import {
	cooldownMax,
	cooldownMin,
	type RunFunc,
	type AutocompleteFunc,
} from "./util_types.js";

export default class SlashCommand {
	private _builder: SlashCommandBuilder;
	private _cooldown: number;
	private _run: RunFunc;
	private _autocomplete: AutocompleteFunc;
	private _botPermissions: PermissionResolvable[];

	public constructor() {
		this._cooldown = 0;
		this._botPermissions = [];
		this._builder = new SlashCommandBuilder().setDMPermission(false);
	}

	public get builder(): SlashCommandBuilder {
		return this._builder;
	}
	public setCommandData<T extends SharedSlashCommand>(
		builder: (o: SlashCommandBuilder) => T
	): this {
		const slashBuilder = builder(this._builder);
		if (!(slashBuilder instanceof SlashCommandBuilder)) {
			throw new Error(
				`${this._builder.name}: Builder provided is not an instance of SlashCommandBuilder`
			);
		}
		this._builder = slashBuilder;
		return this;
	}

	public get cooldown(): number {
		return this._cooldown;
	}
	public setCooldown(seconds: number): this {
		if (seconds >= cooldownMax || seconds <= cooldownMin) {
			throw new Error(
				`${this._builder.name}: Cooldown must be between ${cooldownMin} and ${cooldownMax} seconds.`
			);
		}
		this._cooldown = seconds * 1000;
		return this;
	}

	public get run() {
		return this._run;
	}
	public setRun(runFunction: RunFunc): this {
		this._run = runFunction;
		return this;
	}

	public get autocomplete() {
		return this._autocomplete;
	}
	public setAutocomplete(autocompleteFunction: AutocompleteFunc): this {
		this._autocomplete = autocompleteFunction;
		return this;
	}

	public get botPermissions() {
		return this._botPermissions;
	}
	public setBotPermissions(...permissions: PermissionResolvable[]): this {
		this._botPermissions = permissions;
		return this;
	}
}
