import SlashCommand from "../core/SlashCommand.js";
import bsPokerRun from "../functions/bs_poker/bs_poker_run.js";
const bsPokerCommand = new SlashCommand()
    .setCommandData(builder => builder
    .setName("bs_poker")
    .setDescription("Play a game of BS Poker!")
    .addIntegerOption(option => option
    .setName("cards_to_out")
    .setDescription("Number of cards to get out")
    .setRequired(true)
    .setMinValue(2)
    .setMaxValue(15))
    .addIntegerOption(option => option
    .setName("bet")
    .setDescription("Every player must bet this to join the game, and the winner will take all. (Default: No bet)")
    .setRequired(false)
    .setMinValue(25)
    .setMaxValue(2000))
    .addIntegerOption(option => option
    .setName("common_cards")
    .setDescription("Number of common cards (Default = median of each player's number of cards)")
    .setRequired(false)
    .setMinValue(0)
    .setMaxValue(8))
    .addIntegerOption(option => option
    .setName("player_limit")
    .setDescription("Player limit for the game (Default: maximum possible number)")
    .setRequired(false)
    .setMinValue(2)
    .setMaxValue(15))
    .addIntegerOption(option => option
    .setName("joker_count")
    .setDescription("Number of jokers in the deck (Default: 2)")
    .setRequired(false)
    .setMinValue(0)
    .setMaxValue(4))
    .addIntegerOption(option => option
    .setName("insurance_count")
    .setDescription("Number of high wild cards in the deck (Default: 1)")
    .setRequired(false)
    .setMinValue(0)
    .setMaxValue(4))
    .addIntegerOption(option => option
    .setName("begin_cards")
    .setDescription("Number of cards given to each player at the beginning (Default: 1)")
    .setMinValue(1)
    .setMaxValue(8)
    .setRequired(false))
    .addBooleanOption(option => option
    .setName("allow_join_mid_game")
    .setDescription("Allow players to join mid-game (Default: True)")
    .setRequired(false))
    .addBooleanOption(option => option
    .setName("use_special_cards")
    .setDescription("/help poker Special Cards for more info (Default: False)")
    .setRequired(false)))
    .setCooldown(15)
    .setRun(bsPokerRun);
export default bsPokerCommand;
//# sourceMappingURL=bs_poker_command.js.map