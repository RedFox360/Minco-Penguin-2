import { ContextMenuCommandBuilder, ApplicationCommandType } from "discord.js";
import { type ContextMenuRunFunc } from "./util_types.js";

export default class UserContextMenu {
	private _builder: ContextMenuCommandBuilder;
	private _run: ContextMenuRunFunc;

	public get builder(): ContextMenuCommandBuilder {
		return this._builder;
	}
	public setCommandData(builder: (o: ContextMenuCommandBuilder) => any): this {
		const menuBuilder = builder(
			new ContextMenuCommandBuilder().setType(ApplicationCommandType.User)
		);
		if (!(menuBuilder instanceof ContextMenuCommandBuilder)) {
			throw new Error(
				"Builder provided is not an instance of ContextMenuCommandBuilder"
			);
		}
		this._builder = menuBuilder;
		return this;
	}

	public get run() {
		return this._run;
	}
	public setRun(runFunction: ContextMenuRunFunc): this {
		this._run = runFunction;
		return this;
	}
}
