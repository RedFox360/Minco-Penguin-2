import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, } from "discord.js";
import { chunkArray, colors } from "../util.js";
export default class LeaderboardPaginator {
    constructor(options) {
        var _a, _b, _c, _d;
        this.currentPage = 0;
        this.options = options;
        (_a = this.options).chunkSize ?? (_a.chunkSize = 15);
        (_b = this.options).useSpaces ?? (_b.useSpaces = false);
        (_c = this.options).ephemeral ?? (_c.ephemeral = false);
        (_d = this.options).useBackTick ?? (_d.useBackTick = false);
        this.slices = chunkArray(options.data, this.options.chunkSize);
        this.customIds = {
            first: `${options.id}-first`,
            prev: `${options.id}-prev`,
            next: `${options.id}-next`,
            last: `${options.id}-last`,
        };
        this.first = new ButtonBuilder()
            .setCustomId(this.customIds.first)
            .setStyle(ButtonStyle.Primary)
            .setEmoji("⏪")
            .setDisabled();
        this.prev = new ButtonBuilder()
            .setCustomId(this.customIds.prev)
            .setStyle(ButtonStyle.Primary)
            .setEmoji("⬅️")
            .setDisabled();
        this.next = new ButtonBuilder()
            .setCustomId(this.customIds.next)
            .setEmoji("➡️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(this.slices.length === 1);
        this.last = new ButtonBuilder()
            .setCustomId(this.customIds.last)
            .setEmoji("⏩")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(this.slices.length === 1);
    }
    calculateSpaces() {
        const maxIndexAtCurrentPage = (this.currentPage + 1) * this.options.chunkSize -
            (this.options.chunkSize - this.currentPageData.length);
        console.log(maxIndexAtCurrentPage);
        return " ".repeat(maxIndexAtCurrentPage.toString().length + 1);
    }
    get currentPageData() {
        return this.slices[this.currentPage];
    }
    get component() {
        return new ActionRowBuilder().addComponents(this.first, this.prev, this.next, this.last);
    }
    pageData() {
        const chunkOffset = this.currentPage * this.options.chunkSize;
        return this.currentPageData
            .map((data, idx) => {
            const index = chunkOffset + idx + 1;
            return `${index}. ${data}`;
        })
            .join("\n");
    }
    getEmbed() {
        const spaces = this.options.useSpaces ? this.calculateSpaces() : "";
        let beginningDescription = `${spaces}${this.options.description}`;
        if (this.options.useBackTick) {
            beginningDescription = `\`${beginningDescription}\``;
        }
        return new EmbedBuilder()
            .setTitle(this.options.title)
            .setColor(colors.orange)
            .setDescription(`${beginningDescription}\n${this.pageData()}`)
            .setFooter({
            text: `Page ${this.currentPage + 1}/${this.slices.length} • Your rank: ${this.options.creatorRank}`,
        });
    }
    getMessage(hasComponents = true) {
        return {
            embeds: [this.getEmbed()],
            components: hasComponents ? [this.component] : undefined,
            ephemeral: this.options.ephemeral,
        };
    }
    loadCollector(message) {
        const collector = message.createMessageComponentCollector({
            time: 120000,
            componentType: ComponentType.Button,
        });
        const lastPage = this.slices.length - 1;
        collector.on("collect", bi => {
            switch (bi.customId) {
                case this.customIds.first: {
                    this.currentPage = 0;
                    break;
                }
                case this.customIds.prev: {
                    this.currentPage -= 1;
                    break;
                }
                case this.customIds.next: {
                    this.currentPage += 1;
                    break;
                }
                case this.customIds.last: {
                    this.currentPage = lastPage;
                    break;
                }
                default: {
                    bi.deferUpdate();
                    return;
                }
            }
            this.first.setDisabled(this.currentPage === 0);
            this.prev.setDisabled(this.currentPage === 0);
            this.next.setDisabled(this.currentPage === lastPage);
            this.last.setDisabled(this.currentPage === lastPage);
            if (bi.user.id === this.options.creatorId) {
                bi.update(this.getMessage());
            }
            else {
                const newPaginator = new LeaderboardPaginator({
                    ...this.options,
                    ephemeral: true,
                });
                newPaginator.currentPage = this.currentPage;
                bi.reply(newPaginator.getMessage()).then(res => {
                    newPaginator.loadCollector(res);
                });
            }
        });
        collector.on("end", () => {
            message.edit(this.getMessage(false));
        });
    }
}
//# sourceMappingURL=LeaderboardPaginator.js.map