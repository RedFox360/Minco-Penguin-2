import { EmbedFooterOptions, type APIEmbed } from "discord.js";
import { colors } from "../util.js";
import { formatDeck } from "../cards/basic_card_functions.js";

const specials: string = formatDeck([
	{
		suit: "rj",
		value: 1,
	},
	{ suit: "bj", value: 1 },
]);

const jokerInsurance: string = formatDeck([
	{ suit: "j", value: 1 },
	{ suit: "j", value: 1 },
	{ suit: "i", value: 15 },
]);
const footer: EmbedFooterOptions = {
	text: "Bot made by @obvsam",
	iconURL:
		"https://cdn.discordapp.com/avatars/724786310711214118/edbacd10b52e8c63d4cbbc4f8fb40016.webp",
};

const helpEmbeds: APIEmbed[] = [
	{
		color: colors.blurple,
		title: "BS Poker Help & Rules",
		description: `Welcome to BS Poker! Here you can find information on how to play the game.
To start a game: use </bs_poker:1241939571202064415> command with the specified options.
The host may type "abort" at any time to end an ongoing game.
To kick a player, the host may type "kick @user" (mentioning the user) at any time.`,
		footer,
	},
	{
		color: colors.blurple,
		title: "Rules of BS Poker",
		description: `* BS Poker is a game similar to Poker, with an added element of BSing.
* The game is played with a standard deck of 52 cards, with the addition of jokers and high wild cards (called Insurance Card). Default settings: 2 jokers, 1 insurance.
* The game is played in rounds. At the beginning of the game, the order of the players is randomly shuffled. Each player is dealt one card, which can be seen by clicking the "View Cards" button at any time.
* The first player must make a Poker Call (Information in the next section). The next player must either make a higher call or call BS. 
* If a player calls BS, the cards are revealed. Taking all players' cards and common cards into account, if the call was there, the player who called BS gains a card. If the call was false, the player who made the call gains a card.
* Players can call BS at any point in the game, even if it is not their turn.
* Once a player reaches a certain amount of cards (specified by the host), they are out of the game. Play continues until there is 1 player left, who becomes the winner.

**Joker and Insurance Info:**
${jokerInsurance}

* Jokers act as wild cards for *Flushes only* — they act as a card of any suit. Jokers may be used in other calls, but they will be treated as the lowest card in the deck.
* Insurances act as the highest card of the deck (higher than an Ace). They can be used in any call *except Straight Flushes*. Example: \`Insurance High Diamonds Flush\``,
		footer,
	},
	{
		color: colors.blurple,
		title: "Poker Calls",
		description: `The Poker Calls are as follows:
**Cards Ranked from Lowest to Highest:**
\`Joker < 2 < 3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < Jack < Queen < King < Ace < Insurance\`

**Calls Ranked from Lowest to Highest:**
("The deck" refers to the total combination of all players' cards and common cards)
1. **High Card** e.g. \`Ace High\`) - There exists an Ace in the deck.
1. **Pair** e.g. \`Ace Pair\` - There exist two Aces in the deck.
1. **Double Pair** e.g. \`Ace Pair King Pair\` - There exist two Aces and two Kings in the deck.
1. **Triple Pair** (Nonstandard) e.g. \`Ace Pair King Pair Queen Pair\` - There exist two Aces, two Kings, and two Queens in the deck.
1. **Triple** e.g. \`Triple Ace\` - There exist three Aces in the deck.
1. **Straight** e.g. \`Queen High Straight\` - A straight refers to 5 cards in a sequence. Since the Queen is the highest card, the straight includes Queen, Jack, 10, 9, and 8. If a straight has a high card of 5, 4, 3, or 2, the cards in the straight will "wrap around". e.g. \`3 High Straight\` includes 3, 2, Ace, King, and Queen. A \`Joker High Straight\` includes Joker, Ace, King, Queen, and Jack.
1. **Flush** e.g. \`Queen High Hearts Flush\` - A flush refers to 5 cards of the same suit. The Queen is the highest card in this flush. Therefore, there must be a Queen:hearts: in the deck and 4 other hearts lower than a Queen. For flushes and double flushes, it is less likely that a call is true if the high card is *lower*, so the cards are ranked in reverse order.
1. **Double Flush** (Nonstandard) e.g. \`Queen High Hearts Flush\` \`King Hearts Flush\` - There exist two flushes *of 4 cards each* in the deck.
1. **Full House** e.g. \`Ace Triple 8 Pair\` - There exist three Aces and two 8s in the deck.
1. **Double Triple** (Nonstandard) e.g. \`Ace Triple King Triple\` - There exist three Aces and three Kings in the deck.
1. **Quad** e.g. \`Ace Quad\` - There exist four Aces (of every suit) in the deck.
1. **Straight Flush** e.g. \`Queen High Hearts Straight Flush\` - A straight flush refers to 5 cards of the same suit in a sequence. The Queen is the highest card in the straight flush. Therefore, the deck must include Queen:hearts:, Jack:hearts:, 10:hearts:, 9:hearts:, and 8:hearts:. If the highest card in a straight flush is an Ace, it may be called as \`Royal Flush [suit]\`.

Within each call, you can increase the rank of the card to make the call higher. For example, \`5 High\` is higher than \`2 High\`.`,
		footer,
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
Diamonds Straight Flush: \`dsf\`, etc.
Clubs Royal Flush: \`crf\`, etc.
**Abbreviations of Cards:**
Insurance: \`i\`
Ace: \`a\`
King: \`k\`
Queen: \`q\`
Jack: \`j\`
Joker: \`x\``,
		footer,
	},
	{
		color: colors.blurple,
		title: "Special Cards and Curses",
		description: `If you start a game with the "use_special_cards" option set to True, these 2 cards will be added to the deck:
${specials}

:black_large_square: **Black Joker**: A player with this card can remove any card from the Common Cards after any player (including themselves) calls a BS.

:red_square: **Red Joker**: If a player with this card calls a BS when it is *not their turn*, they will lose a card if their BS was correct (unless they have 1 card). If incorrect, they will gain a card as usual.

:smiling_imp: **Curses**: If Curses are enabled at the beginning of a game, if 3 calls in a row are false, the round will immediately stop and all players will gain a card. This can cause multiple players to go out in one round.

:red_square: **Blood Joker**: Blood Jokers are displayed the same as a red joker. If a curse happens, the player with the Blood Joker will *lose* a card (unless they have 1 card). Blood Jokers also retain the Red Joker abilities.

:clown: **Clown Joker**: Clown Jokers are displayed the same as red joker. When a player with a Clown Joker clicks "View Cards," a "Clown" button will appear. When clicked, the order of players will reverse. If a player uses a Clown Joker and it becomes their turn again, they will be forced to B.S. Clown Jokers do *not* retain Red Joker abilities.

:imp: **Blood + Clown + Red Joker**: If this option is selected, the Red Joker will have the abilities of the Blood Joker and Clown Joker as well.

These cards are *publicly visible* to all players throughout the game. The players which have a Special Card are shown in the New Round message and when a player clicks "View Cards". However, it is not shown which Special Card they have.

In addition to their special abilities, these cards **also act as regular jokers** and may be used as wild cards for flushes.`,
		footer,
	},
];

export default helpEmbeds;
