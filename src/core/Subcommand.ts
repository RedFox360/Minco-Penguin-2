import { SlashCommandSubcommandBuilder } from "discord.js";
import { type RunFunc } from "./util_types";

export default class Subcommand<T = RunFunc> {
	private _builder: SlashCommandSubcommandBuilder;
	private _run: T;

	public get builder(): SlashCommandSubcommandBuilder {
		return this._builder;
	}
	public setCommandData(
		builder: (o: SlashCommandSubcommandBuilder) => any
	): this {
		const slashBuilder = builder(new SlashCommandSubcommandBuilder());
		if (!(slashBuilder instanceof SlashCommandSubcommandBuilder)) {
			throw new Error(
				`${this._builder.name} Builder provided is not an instance of SlashCommandBuilder`
			);
		}
		this._builder = slashBuilder;
		return this;
	}

	public get run() {
		return this._run;
	}
	public setRun(runFunction: T): this {
		this._run = runFunction;
		return this;
	}
}
