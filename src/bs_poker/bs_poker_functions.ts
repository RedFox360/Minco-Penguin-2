import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Collection,
	EmbedBuilder,
	Snowflake,
	TimestampStyles,
	time,
} from "discord.js";
import {
	type PlayerHands,
	type Suit,
	type Value,
	type Deck,
	HandRank,
	type Call,
} from "./bs_poker_types.js";
const allowedTime = 40_000;

export function createDeck() {
	const suits: Suit[] = ["H", "D", "C", "S"];
	const values: Value[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
	const deck: Deck = [{ suit: "n", value: 0 }];
	for (const suit of suits) {
		for (const value of values) {
			deck.push({ suit, value });
		}
	}
	deck.push({ suit: "n", value: 15 });
	return deck;
}

export function suitToEmoji(suit: string) {
	switch (suit) {
		case "H":
			return ":hearts:";
		case "D":
			return ":diamonds:";
		case "C":
			return ":clubs:";
		case "S":
			return ":spades:";
		default:
			return "";
	}
}

export function valueToSymbol(value: number, short = false) {
	switch (value) {
		case 0:
			return "Joker";
		case 11:
			return short ? "J" : "Jack";
		case 12:
			return short ? "Q" : "Queen";
		case 13:
			return short ? "K" : "King";
		case 14:
			return short ? "A" : "Ace";
		case 15:
			return "Insurance";
		default:
			return value.toString();
	}
}

export function deckToStringArray(deck: Deck, short = false) {
	return deck.map(card => {
		return `${valueToSymbol(card.value, short)}${suitToEmoji(card.suit)}`;
	});
}

export function formatDeck(deck: Deck, short = false) {
	return deckToStringArray(deck, short).join("  ");
}

export async function gameLogic(
	interaction: ChatInputCommandInteraction<"cached">,
	players: string[],
	cardsToOut: number
) {
	const deck = createDeck();
	let round = 0;
	await interaction.channel.send(formatDeck(deck, true));
	const playersCardsEntitled = new Collection<Snowflake, number>();
	players.forEach(p => playersCardsEntitled.set(p, 1));
	const playerHands: PlayerHands = new Collection<Snowflake, Deck>();
	players.forEach(async p => {
		const hand: Deck = [];
		for (let i = 0; i < playersCardsEntitled.get(p); i++) {
			const cardIndex = Math.floor(Math.random() * deck.length);
			hand.push(deck[cardIndex]);
			deck.splice(cardIndex, 1);
		}
		playerHands.set(p, hand);
		// For debugging: Prints the hand of each player
		await interaction.channel.send(`<@${p}>\n${formatDeck(hand)}`);
	});

	await handlePlayerTurns(
		interaction,
		players,
		cardsToOut,
		playerHands,
		playersCardsEntitled
	);
}

async function handlePlayerTurns(
	interaction: ChatInputCommandInteraction<"cached">,
	players: string[],
	cardsToOut: number,
	playerHands: Collection<Snowflake, Deck>,
	playerCardsEntitled: Collection<Snowflake, number>,
	i = 0,
	currentCall: Call | null = null
) {
	let currentPlayer = players[i];
	const viewCardsButton = new ButtonBuilder()
		.setCustomId("view_cards")
		.setLabel("View Cards")
		.setStyle(ButtonStyle.Secondary);
	const row = new ActionRowBuilder<ButtonBuilder>().addComponents();
	const msg = await interaction.channel.send({
		content: `<@${currentPlayer}>, it's your turn. Please type your call.`,
		components: [row.addComponents(viewCardsButton)],
	});

	const buttonCollector = msg.createMessageComponentCollector({
		filter: i => i.customId === "view_cards",
		time: allowedTime,
	});

	buttonCollector.on("collect", async buttonInteraction => {
		if (!players.includes(buttonInteraction.user.id)) {
			await buttonInteraction.reply({
				content: "You are not a player in this game.",
				ephemeral: true,
			});
			return;
		}
		await buttonInteraction.reply({
			content: formatDeck(playerHands.get(buttonInteraction.user.id)),
			ephemeral: true,
		});
	});

	let hasCalled = false;
	const msgCollector = interaction.channel.createMessageCollector({
		filter: m => m.author.id === currentPlayer,
		time: allowedTime,
	});

	msgCollector.on("collect", async message => {
		const call = parseCall(message.content);
		if (!call || (call.call as any) === -1) {
			message
				.reply({
					content: "Call could not be parsed. Please try again.",
				})
				.then(m => {
					setTimeout(() => m.delete(), 20_000);
				});
			return;
		}
		if (currentCall) {
			if (!isHigher(call, currentCall)) {
				message.reply({
					content: `Your call is not higher than the current call (${formatCall(
						currentCall
					)}). Please try again.`,
				});
				return;
			}
		}
		await interaction.channel.send(formatCall(call));
		currentCall = call;
		hasCalled = true;
		msgCollector.stop();
		if (i >= players.length - 1) i = 0;
		else i++;

		await handlePlayerTurns(
			interaction,
			players,
			cardsToOut,
			playerHands,
			playerCardsEntitled,
			i,
			currentCall
		);
	});

	msgCollector.on("end", async () => {
		if (!hasCalled) {
			await interaction.channel.send({
				content: `<@${currentPlayer}> failed to make a call in time. They gain a card and a new round will start now.`,
			});

			if (i >= players.length - 1) i = 0;
			else i++;

			handlePlayerTurns(
				interaction,
				players,
				cardsToOut,
				playerHands,
				playerCardsEntitled,
				i
			);
		}
	});
}

const names = [
	["high", "high card", "h"],
	["pair", "double", "p", "d"],
	["double pair", "two pair", "dp", "tp"],
	["triple", "t"],
	["straight", "s"],
	["flush:hearts:", "flush hearts", "hearts flush", "fh", "hf"],
	["flush:diamonds:", "flush diamonds", "diamonds flush", "fd", "df"],
	["flush:clubs:", "flush clubs", "clubs flush", "fc", "cf"],
	["flush:spades:", "flush spades", "spades flush", "fs", "sf"],
	["full house", "house"],
	["quad", "q"],
	[
		"straight flush:hearts:",
		"straight flush hearts",
		"hearts straight flush",
		"sfh",
		"hsf",
	],
	[
		"straight flush:diamonds:",
		"straight flush diamonds",
		"diamonds straight flush",
		"sfd",
		"dsf",
	],
	[
		"straight flush:clubs:",
		"straight flush clubs",
		"clubs straight flush",
		"sfc",
		"csf",
	],
	[
		"straight flush:spades:",
		"straight flush spades",
		"spades straight flush",
		"sfs",
		"ssf",
	],
];
export function parseCall(call: string): Call | null {
	try {
		if (names[2].filter(x => call.includes(x)).length > 0) return null;
		const split = call.split(" ");

		if (
			split.indexOf("pair") !== split.lastIndexOf("pair") ||
			split.indexOf("p") !== split.lastIndexOf("p")
		) {
			// double pair case
			// double pairs are asked like this: 2 pair 4 pair
			const high1 = symbolToValue(split[0]);
			if (high1 === null) return null;
			const high2 = symbolToValue(split[2]);
			if (high2 === null) return null;
			return {
				high: [high1, high2],
				call: HandRank.DoublePair,
			};
		}

		const high = symbolToValue(split[0]);
		if (high === null) return null;
		const callName = split.slice(1).join(" ");
		const callIndex = names.findIndex(name => name.includes(callName));

		return {
			high: high,
			call: callIndex,
		};
	} catch (e) {
		return null;
	}
}

// convert text to value, e.g. "2" -> 2, "Joker" -> 0, "K" or "King" -> 13
export function symbolToValue(textGiven: string): Value | null {
	const text = textGiven.toLowerCase();
	if (text === "joker") return 0;
	if (text === "insurance") return 15;
	if (text === "k" || text === "king") return 13;
	if (text === "q" || text === "queen") return 12;
	if (text === "j" || text === "jack") return 11;
	if (text === "a" || text === "ace") return 14;
	const value = parseInt(text);
	if (Number.isNaN(value)) return null;
	if (<Value>value === undefined) return null;
	return value as Value;
}

// make every word in a string start with a capital
export function capitalize(text: string) {
	return text
		.split(" ")
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}
function callNumberToName(call: HandRank) {
	return capitalize(names[call][0]);
}

export function createEmbed(
	interaction: ChatInputCommandInteraction<"cached">,
	playerLimit: number,
	players: string[],
	startTime: number,
	gameStarted = false
) {
	return new EmbedBuilder()
		.setTitle(gameStarted ? "BS Poker Game Starting" : "BS Poker")
		.setDescription(
			`Welcome to a game of BS Poker!
Current players: ${players.map(player => `<@${player}>`).join(", ")}` +
				(gameStarted
					? ""
					: `\n${playerLimit - players.length} more players can join.${
							players.length >= 2
								? ""
								: " Minimum 2 players required to start the game."
					  }

<@${
							interaction.user.id
					  }> is the host of the game and can abort or start it immediately.
Otherwise, the game will start in ${time(
							Math.floor(startTime / 1000),
							TimestampStyles.RelativeTime
					  )}`)
		)
		.setTimestamp()
		.setColor(gameStarted ? 0x58d68d : 0x7289da)
		.setFooter({ text: interaction.guild.name });
}

// returns whether call1 is a higher call than call2
export function isHigher(call1: Call, call2: Call) {
	const call_call1 = fixFlushes(call1.call);
	const call_call2 = fixFlushes(call2.call);
	if (call_call1 > call_call2) return true;
	if (call_call1 < call_call2) return false;
	if (call_call1 === HandRank.DoublePair) {
		return (
			Math.max(...(call1.high as [Value, Value])) >
			Math.max(...(call2.high as [Value, Value]))
		);
	}
	if (call_call1 !== HandRank.Flush) return call1.high > call2.high;
	return call1.high < call2.high;
}

function fixFlushes(d: number) {
	if ([5, 6, 7, 8].includes(d)) {
		return 5;
	}
	if ([11, 12, 13, 14].includes(d)) {
		return 11;
	}
	return d;
}

function formatCall(call: Call) {
	if (call.call === HandRank.DoublePair) {
		return `${valueToSymbol(call.high[0])} ${valueToSymbol(
			call.high[1]
		)} Double Pair`;
	}
	return `${valueToSymbol(call.high)} ${callNumberToName(call.call)}`;
}
