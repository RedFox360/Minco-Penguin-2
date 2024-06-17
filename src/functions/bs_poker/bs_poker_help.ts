import { APIEmbed } from "discord.js";
import { colors } from "../util.js";

const helpEmbeds: APIEmbed[] = [
	{
		color: colors.blurple,
		title: "BS Poker Help & Rules",
		description: `Welcome to BS Poker! Here you can find information on how to play the game.
To start a game: use </bs_poker:1241939571202064415> command with the specified options.
The host may type "abort" at any time to end an ongoing game.`,
		footer: { text: "Bot made by @obvsam" },
	},
	{
		color: colors.blurple,
		title: "Rules of BS Poker",
		description: `* BS Poker is a game similar to Poker, with an added element of BSing.
* The game is played with a standard deck of 52 cards, with the addition of jokers and high wild cards (called Insurance Card, although it does not insure players against anything). The default settings have 2 jokers and 1 high wild card.
* The game is played in rounds. At the beginning of the game, the order of the players is randomly shuffled. Each player is dealt one card, which can be seen by clicking the "View Cards" button at any time.
* The first player must make a Poker Call (Information in the next section). The next player must either make a higher call or call BS. If a player calls BS, the cards are revealed. Taking all players' cards into account (and common cards if the game has them), if the call was there, the player who called BS gains a card. If it was not there, the player who made the call gains a card.
Once a player reaches a certain amount of cards (specified by the host), they are out of the game. Play continues until there is 1 player left, who becomes the winner.

**Joker and Insurance Info:**
* Jokers act as wild cards for *Flushes only* — they act as a card of any suit. Jokers may be used in other calls, but they will be treated as the lowest card in the deck.
* Insurances act as the highest card of the deck (higher than an Ace). They can be used in any call *except Straight Flushes*. Example: \`Insurance High Diamonds Flush\``,
		footer: { text: "Bot made by @obvsam" },
	},
	{
		color: colors.blurple,
		title: "Poker Calls",
		description: `The Poker Calls are as follows:
**Cards Ranked from Lowest to Highest:**
\`Joker < 2 < 3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < Jack < Queen < King < Ace < Insurance\`

**Calls Ranked from Lowest to Highest:**
(Note that "the deck" refers to the total combination of all players' cards and common cards)
1. **High Card** e.g. \`Ace High\`) - There exists an Ace in the deck.
1. **Pair** e.g. \`Ace Pair\` - There exist two Aces in the deck.
1. **Double Pair** e.g. \`Ace Pair King Pair\` - There exist two Aces and two Kings in the deck.
1. **Triple Pair** e.g. \`Ace Pair King Pair Queen Pair\` - There exist two Aces, two Kings, and two Queens in the deck.
1. **Triple** e.g. \`Triple Ace\` - There exist three Aces in the deck.
1. **Straight** e.g. \`Queen High Straight\` - A straight refers to 5 cards in a sequence. Since the Queen is the highest card, the straight includes Queen, Jack, 10, 9, and 8. Note that if a straight has a high card of 5, 4, 3, or 2, the cards in the straight will "wrap around". e.g. \`3 High Straight\` includes 3, 2, Ace, King, and Queen. A \`Joker High Straight\` includes Joker, Ace, King, Queen, and Jack.
1. **Flush** e.g. \`Queen High Hearts Flush\` - A flush refers to 5 cards of the same suit. The Queen is called as the highest card in this flush. Therefore, there must be a Queen:hearts: in the deck, and 4 other hearts that are lower than a Queen. Note that for flushes (and double flushes), it is better to have a *lower valued card* as the highest card, because it restricts the possibilities more.
1. **Double Flush** e.g. \`Queen High Hearts Flush\` \`King Hearts Flush\` - There exist two flushes *of 4 cards each* in the deck.
1. **Full House** e.g. \`Ace Triple 8 Pair\` - There exist three Aces and two 8s in the deck.
1. **Double Triple** e.g. \`Triple Ace\` \`Triple King\` - There exist three Aces and three Kings in the deck.
1. **Quad** e.g. \`Quad Ace\` - There exist four Aces (of every suit) in the deck.
1. **Straight Flush** e.g. \`Queen High Hearts Straight Flush\` - A straight flush refers to 5 cards of the same suit in a sequence. The Queen is the highest card in the straight flush. Therefore, the deck must include Queen:hearts:, Jack:hearts:, 10:hearts:, 9:hearts:, and 8:hearts:. Note that if the highest card in a straight flush is an Ace, it may be called as \`Royal Flush [suit]\`.

Within each call, you can increase the rank of the card to make the call higher. For example, \`5 High\` is higher than \`2 High\`.`,
		footer: { text: "Bot made by @obvsam" },
	},
	{
		color: colors.blurple,
		title: "How to Make a Call",
		description: `To make a call, type the call in the chat when it is your turn. For example, if you want to call an Ace Pair, type \`Ace Pair\`. If you want to call a Straight Flush:hearts: with the highest card being a Queen:hearts:, type \`Queen High Hearts Straight Flush\`. If you want to call a Royal Flush of Spades, type \`Royal Flush Spades\`. If you want to call a High Card of a Joker, type \`Joker High\`.
**Abbreviations of Calls:**
High Card: \`h\`
Pair: \`p\`
Triple: \`t\`
Straight: \`s\`
Hearts Flush: \`hf\`, etc.
Quad: \`q\`
Hearts Straight Flush: \`hsf\`
Hearts Royal Flush: \`hrf\`
**Abbreviations of Cards:**
Insurance: \`i\`
Ace: \`a\`
King: \`k\`
Queen: \`q\`
Jack: \`j\`
Joker: \`x\``,
		footer: { text: "Bot made by @obvsam" },
	},
	{
		color: colors.blurple,
		title: "Special Cards",
		description: `If you start a game with the "use_special_cards" option set to True, these 2 cards will be added to the deck:

:black_large_square: **Black Joker** (\`Black X\`): A player with this card can remove any card from the Common Cards after any player (including themselves) calls a BS.

:red_square: **Red Joker** (\`Red X\`): If a player with this card calls a BS when it is *not their turn*, they will lose a card if their BS was correct. If incorrect, they will gain a card as usual.

These cards are *publicly visible* to all players throughout the game. The players which have a Special Card are shown in the "New Round" message at the beginning of every round, and when a player clicks "View Cards". However, it is not written which Special Card they have.

In addition to their special abilities, these cards **also act as regular jokers** and may be used as wild cards for flushes.`,
		footer: { text: "Bot made by @obvsam" },
	},
];

export default helpEmbeds;
