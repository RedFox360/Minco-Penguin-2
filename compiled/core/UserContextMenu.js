import { ContextMenuCommandBuilder, ApplicationCommandType, } from "discord.js";
export default class UserContextMenu {
    get builder() {
        return this._builder;
    }
    setCommandData(builder) {
        const menuBuilder = builder(new ContextMenuCommandBuilder().setType(ApplicationCommandType.User));
        if (!(menuBuilder instanceof ContextMenuCommandBuilder)) {
            throw new Error("Builder provided is not an instance of ContextMenuCommandBuilder");
        }
        this._builder = menuBuilder;
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
//# sourceMappingURL=UserContextMenu.js.map