import { EmbedBuilder, RESTJSONErrorCodes, } from "discord.js";
import { colors, hasAdminForGames, invalidNumber, replyThenDelete, } from "../util.js";
class ColumnFullError extends Error {
}
const gameTime = 1800000;
export default class Connect4 {
    static createBoard() {
        return Array.from({ length: 6 }, () => Array.from({ length: 7 }, () => 0));
    }
    constructor(interaction, opponentId) {
        this.interaction = interaction;
        this.opponentId = opponentId;
        this.round = 0;
        this.winner = 0;
        this.lastMove = null;
        this.board = Connect4.createBoard();
        /*
            Board Visulization:
            1 2 3 4 5 6 7
            0 0 0 0 0 0 0
            0 0 0 0 0 0 0
            0 0 0 0 0 0 0
            0 0 0 0 0 0 0
            0 0 0 0 0 0 0
            0 0 0 0 0 0 0
        */
    }
    get turn() {
        return this.round % 2 === 0 ? 1 : -1;
    }
    numToPlayer(num) {
        return num === 1 ? this.interaction.user.id : this.opponentId;
    }
    get currentPlayer() {
        return this.numToPlayer(this.turn);
    }
    displayBoard() {
        // display board here
        return (":one: :two: :three: :four: :five: :six: :seven:\n" +
            this.board
                .map(row => row
                .map(cell => {
                if (cell === 0)
                    return ":black_circle:";
                if (cell === 1)
                    return ":red_circle:";
                if (cell === -1)
                    return ":yellow_circle:";
            })
                .join(" "))
                .join("\n"));
    }
    displayTurnOrWin() {
        if (this.winner) {
            const [winnerId, loserId] = this.winner === 1
                ? [this.interaction.user.id, this.opponentId]
                : [this.opponentId, this.interaction.user.id];
            return `<@${winnerId}> has won against <@${loserId}>!`;
        }
        return `:red_circle: ${this.interaction.user} vs. :yellow_circle: <@${this.opponentId}>\n\n<@${this.currentPlayer}>'s turn.\nPlease type a column number (1-7) to place a tile.\n${this.lastMove != null ? `Last Move: \`${this.lastMove + 1}\`\n` : ""}Round: \`${this.round + 1}\``;
    }
    gameEmbed() {
        const color = this.winner ? colors.green : colors.blurple;
        const embed = new EmbedBuilder()
            .setTitle("Connect 4")
            .setDescription(`${this.displayTurnOrWin()}`)
            .addFields({ name: "Board", value: this.displayBoard() })
            .setColor(color);
        return embed;
    }
    async sendGameMsg() {
        if (this.gameMsg)
            this.gameMsg.delete();
        this.gameMsg = await this.interaction.channel.send({
            embeds: [this.gameEmbed()],
        });
    }
    async updateGameMsg() {
        try {
            this.gameMsg = await this.gameMsg.edit({
                embeds: [this.gameEmbed()],
            });
        }
        catch (err) {
            if (err.code === RESTJSONErrorCodes.UnknownMessage) {
                await this.sendGameMsg();
            }
            else {
                console.error(err);
            }
        }
    }
    // place a piece in a column
    // if the column is full, throw an error
    // if the column is not full, set the cell to the current turn number
    placePiece(column) {
        if (this.board[0][column] !== 0) {
            throw new ColumnFullError();
        }
        let rowPlaced;
        for (let i = 5; i >= 0; i--) {
            if (this.board[i][column] === 0) {
                this.board[i][column] = this.turn;
                rowPlaced = i;
                break;
            }
        }
        return rowPlaced;
    }
    static checkLine(a, b, c, d) {
        // Check first cell non-zero and all cells match
        return a !== 0 && a === b && a === c && a === d;
    }
    checkWinner() {
        // Check down
        for (let r = 0; r < 3; r++)
            for (let c = 0; c < 7; c++)
                if (Connect4.checkLine(this.board[r][c], this.board[r + 1][c], this.board[r + 2][c], this.board[r + 3][c]))
                    return this.board[r][c];
        // Check right
        for (let r = 0; r < 6; r++)
            for (let c = 0; c < 4; c++)
                if (Connect4.checkLine(this.board[r][c], this.board[r][c + 1], this.board[r][c + 2], this.board[r][c + 3]))
                    return this.board[r][c];
        // Check down-right
        for (let r = 0; r < 3; r++)
            for (let c = 0; c < 4; c++)
                if (Connect4.checkLine(this.board[r][c], this.board[r + 1][c + 1], this.board[r + 2][c + 2], this.board[r + 3][c + 3]))
                    return this.board[r][c];
        // Check down-left
        for (let r = 3; r < 6; r++)
            for (let c = 0; c < 4; c++)
                if (Connect4.checkLine(this.board[r][c], this.board[r - 1][c + 1], this.board[r - 2][c + 2], this.board[r - 3][c + 3]))
                    return this.board[r][c];
        return 0;
    }
    async handleWinners() {
        this.winner = this.checkWinner();
        if (this.winner === 0)
            return false;
        if (this.winner) {
            await this.sendGameMsg();
            this.msgCollector.stop();
            return true;
        }
    }
    async gameLogic() {
        // game logic here
        await this.sendGameMsg();
        this.msgCollector = this.interaction.channel.createMessageCollector({
            time: gameTime,
        });
        this.msgCollector.on("collect", async (msg) => {
            if (msg.content.toLowerCase() === "abort" &&
                hasAdminForGames(msg.author.id, msg.member.permissions, this.interaction.user.id)) {
                this.msgCollector.stop();
                msg.reply("Game aborted.");
                return;
            }
            if (msg.author.id !== this.currentPlayer)
                return;
            const givenColumn = parseInt(msg.content);
            if (invalidNumber(givenColumn) || givenColumn < 1 || givenColumn > 7)
                return;
            const column = givenColumn - 1;
            try {
                this.placePiece(column);
                if (this.round >= 4) {
                    const winnerExists = await this.handleWinners();
                    if (winnerExists)
                        return;
                }
            }
            catch (err) {
                if (err instanceof ColumnFullError) {
                    replyThenDelete(msg, "That column is full, please try again.");
                    setTimeout(() => {
                        msg.delete();
                    }, 20000);
                }
                else {
                    console.error(err);
                }
                return;
            }
            this.round += 1;
            this.lastMove = column;
            await msg.delete();
            if (this.round >= 42) {
                this.msgCollector.stop();
                msg.reply("This game has ended in a draw.");
                return;
            }
            if (this.round % 4 === 0) {
                await this.sendGameMsg();
            }
            else {
                await this.updateGameMsg();
            }
        });
        return;
    }
}
//# sourceMappingURL=connect4_class.js.map