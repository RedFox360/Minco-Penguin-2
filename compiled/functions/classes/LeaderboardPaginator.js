import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, inlineCode, } from "discord.js";
import { chunkArray, colors } from "../util.js";
const chunkSize = 15;
const collectorTime = 300000;
export default class LeaderboardPaginator {
    constructor(options) {
        var _a, _b;
        this.options = options;
        this.currentPage = 0;
        (_a = this.options).useSpaces ?? (_a.useSpaces = false);
        (_b = this.options).ephemeral ?? (_b.ephemeral = false);
        this.slices = chunkArray(options.data, chunkSize);
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
        const maxIndexAtCurrentPage = (this.currentPage + 1) * chunkSize -
            (chunkSize - this.currentPageData.length);
        return " ".repeat(maxIndexAtCurrentPage.toString().length + 1);
    }
    get currentPageData() {
        return this.slices[this.currentPage];
    }
    get component() {
        return new ActionRowBuilder().addComponents(this.first, this.prev, this.next, this.last);
    }
    pageData() {
        const chunkOffset = this.currentPage * chunkSize;
        return this.currentPageData
            .map((data, idx) => {
            const absIndex = chunkOffset + idx + 1;
            return `${absIndex}. ${data}`;
        })
            .join("\n");
    }
    getEmbed() {
        let description;
        if (this.options.useSpaces) {
            description = inlineCode(this.calculateSpaces() + this.options.description);
        }
        else {
            description = this.options.description;
        }
        let footerText = `Page ${this.currentPage + 1}/${this.slices.length}`;
        if (this.options.creatorRank) {
            // assert creatorRank exists and it is not 0
            footerText += ` • Your rank: ${this.options.creatorRank}`;
        }
        return new EmbedBuilder()
            .setTitle(this.options.title)
            .setColor(colors.orange)
            .setDescription(`${description}\n${this.pageData()}`)
            .setFooter({
            text: footerText,
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
        if (this.slices.length <= 1)
            return;
        const collector = message.createMessageComponentCollector({
            time: collectorTime,
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