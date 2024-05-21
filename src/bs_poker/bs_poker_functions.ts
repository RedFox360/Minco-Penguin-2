import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Collection,
	EmbedBuilder,
	MessageCollector,
	PermissionFlagsBits,
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
	names,
	PlayerCall,
	Card,
	RNI,
	RNIKeys,
	emoji,
} from "./bs_poker_types.js";
import { promisify } from "util";
const allowedTime = 40_000;
const timeBetweenRounds = 8_000;
const gameMap = new Collection<Snowflake, number>();

function createDeck(jokerCount: number, insuranceCount: number) {
	const suits: Suit[] = ["H", "D", "C", "S"];
	const values: Value[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
	const deck: Deck = [];
	for (let i = 0; i < jokerCount; i++) {
		deck.push({ suit: "j", value: 0 });
	}
	for (const suit of suits) {
		for (const value of values) {
			deck.push({ suit, value });
		}
	}
	for (let i = 0; i < insuranceCount; i++) {
		deck.push({ suit: "i", value: 15 });
	}
	return deck;
}

function suitToEmoji(suit: string) {
	switch (suit) {
		case "H":
			return emoji.hearts;
		case "D":
			return emoji.diamonds;
		case "C":
			return emoji.clubs;
		case "S":
			return emoji.spades;
		default:
			return "";
	}
}

function valueToSymbol(value: number, short = false) {
	if (!value) return null;
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

function deckToStringArray(deck: Deck, short = false) {
	return deck.map(card => {
		return `${valueToSymbol(card.value, short)}${suitToEmoji(card.suit)}`;
	});
}

function formatDeck(deck: Deck, short = false) {
	return deckToStringArray(deck, short).join("  ");
}

export async function gameLogic(
	interaction: ChatInputCommandInteraction<"cached">,
	players: string[],
	cardsToOut: number,
	commonCardsAmount: number,
	jokerCount: number,
	insuranceCount: number
) {
	gameMap.set(interaction.id, 0);
	let deck: Deck;
	let round = 0;
	let playerCardsEntitled = new Collection<Snowflake, number>();
	players.forEach(p => playerCardsEntitled.set(p, 1));
	const playerHands: PlayerHands = new Collection<Snowflake, Deck>();
	let commonCards: Deck = [];

	while (players.length > 1) {
		deck = createDeck(jokerCount, insuranceCount);
		let startingIndex = gameMap.get(interaction.id) ?? 0;
		if (startingIndex === -2) {
			return;
		}
		const roundBeginTime = Date.now() + timeBetweenRounds;
		if (round > 0 && playerHands.size > 0) {
			// Print everyone's hands
			const handsList = playerHands
				.map((hand, player) => `<@${player}>: **${formatDeck(hand)}**`)
				.join("\n");

			interaction.channel
				.send({
					embeds: [
						new EmbedBuilder()
							.setTitle("Hands from Last Round")
							.setDescription(
								`Common Cards: ${
									commonCards.length === 0
										? "None"
										: `**${formatDeck(commonCards)}**`
								}\n${handsList}`
							)
							.setColor(0x7289da),
					],
				})
				.then(msg => {
					setTimeout(() => {
						msg.edit({ content: "" });
					}, timeBetweenRounds);
				});
		}
		players.forEach(p => {
			const entitled = playerCardsEntitled.get(p);
			if (entitled >= cardsToOut || Number.isNaN(entitled) || !entitled) {
				interaction.channel.send(`<@${p}> is out of the game.`);
				playerCardsEntitled.delete(p);
				players = players.filter(player => player !== p);
			}
		});
		if (players.length <= 1) {
			break;
		}
		if (startingIndex === -1 || startingIndex >= players.length) {
			startingIndex = 0;
		}
		const embedCreator = (x: string) =>
			new EmbedBuilder()
				.setTitle("New Round")
				.setDescription(
					`Common Cards: ${x}\n<@${players[startingIndex]}> will start the round.`
				)
				.addFields({
					name: "Players",
					value: `${players
						.map(p => `<@${p}>: ${playerCardsEntitled.get(p)} cards`)
						.join("\n")}`,
				})
				.setColor(0x58d68d);
		const newRoundMsg = await interaction.channel.send({
			embeds: [
				embedCreator(
					round > 0
						? `will be shown ${time(
								Math.floor(roundBeginTime / 1000),
								TimestampStyles.RelativeTime
						  )}`
						: ""
				),
			],
		});
		playerHands.clear();
		commonCards = [];
		// remove all players from playerHands and playerCardsEntitled whose amount of cards is greater than or equal to the cardsToOut
		if (players.length <= 1) {
			break;
		}

		players.forEach(async p => {
			const hand: Deck = [];
			for (let i = 0; i < playerCardsEntitled.get(p); i++) {
				const cardIndex = Math.floor(Math.random() * deck.length);
				hand.push(deck[cardIndex]);
				deck.splice(cardIndex, 1);
			}
			playerHands.set(p, hand);
			// For debugging: Prints the hand of each player
			// await interaction.channel.send(`<@${p}>\n${formatDeck(hand)}`);
		});

		if (commonCardsAmount !== 0) {
			const actualAmount =
				commonCardsAmount > 0
					? commonCardsAmount
					: Math.floor(median(Array.from(playerCardsEntitled.values())));
			for (let i = 0; i < actualAmount; i++) {
				const cardIndex = Math.floor(Math.random() * deck.length);
				commonCards.push(deck[cardIndex]);
				deck.splice(cardIndex, 1);
			}
		}

		if (round > 0) await promisify(setTimeout)(timeBetweenRounds); // wait 5 seconds before starting next round

		await newRoundMsg.edit({
			embeds: [
				embedCreator(
					`${
						commonCards.length > 0 ? `**${formatDeck(commonCards)}**` : "None"
					}`
				),
			],
		});

		await handlePlayerTurns(
			interaction,
			players,
			cardsToOut,
			playerHands,
			playerCardsEntitled, // Will be updated in place.
			insuranceCount,
			commonCards,
			startingIndex
		);

		round += 1;
	}

	await interaction.channel.send({
		embeds: [
			new EmbedBuilder()
				.setTitle("Game Over!")
				.setDescription(`<@${players[0]}> has won the game! Congratulations!`)
				.setColor(0x58d68d),
		],
	});
	return;
}

function median(x: number[]) {
	const sorted = x.sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 !== 0
		? sorted[mid]
		: (sorted[mid - 1] + sorted[mid]) / 2;
}

async function handlePlayerTurns(
	interaction: ChatInputCommandInteraction<"cached">,
	players: string[],
	cardsToOut: number,
	playerHands: Collection<Snowflake, Deck>,
	playerCardsEntitled: Collection<Snowflake, number>,
	insuranceCount: number,
	commonCards: Deck = [],
	i = 0,
	currentCall: PlayerCall | null = null
) {
	if (i >= players.length) i = 0;
	let currentPlayer = players[i];
	let roundOver = false;
	let cardGainer: Snowflake | null = null;
	let aborted = false;
	const viewCardsButton = new ButtonBuilder()
		.setCustomId("view_cards")
		.setLabel("View Cards")
		.setStyle(ButtonStyle.Secondary);
	const bsButton = new ButtonBuilder()
		.setCustomId("bs")
		.setLabel("BS")
		.setStyle(ButtonStyle.Danger);

	const getRow = (disabled: boolean) => {
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			viewCardsButton
		);
		if (currentCall) row.addComponents(bsButton.setDisabled(disabled));
		return row;
	};

	const timeUp = Date.now() + allowedTime;
	const msgContent = `${
		currentCall
			? `<@${currentCall.player}> has called **${formatCall(
					currentCall.call
			  )}**.\n`
			: ""
	}<@${currentPlayer}>, it is your turn.`;
	const msg = await interaction.channel.send({
		content:
			msgContent +
			` Please type your call ${time(
				Math.floor(timeUp / 1000),
				TimestampStyles.RelativeTime
			)}.`,
		components: [getRow(false)],
	});

	const buttonCollector = msg.createMessageComponentCollector({
		filter: i => i.customId === "view_cards" || i.customId === "bs",
		time: allowedTime,
	});

	let hasCalled = false;
	let hasCalledBS = false;
	const msgCollector = interaction.channel.createMessageCollector({
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
		if (buttonInteraction.customId === "view_cards") {
			await buttonInteraction.reply({
				content: `Your Hand: **${formatDeck(
					playerHands.get(buttonInteraction.user.id)
				)}**\nCommon Cards: ${
					commonCards.length === 0 ? "None" : `**${formatDeck(commonCards)}**`
				}`,
				ephemeral: true,
			});
			return;
		}

		// BS button
		if (hasCalledBS) {
			await buttonInteraction.reply({
				content:
					"Sorry, another player seems to have pressed the BS button before you.",
				ephemeral: true,
			});
			return;
		}
		hasCalledBS = true;
		await msg.edit({
			content: msgContent,
			components: [getRow(true)],
		});
		if (buttonInteraction.user.id === currentCall.player) {
			await buttonInteraction.reply({
				content: "You cannot call BS on your own call.",
				ephemeral: true,
			});
			return;
		}
		await buttonInteraction.reply({
			content: `BS called by <@${buttonInteraction.user.id}>!`,
		});

		const currentDeck: Deck = [].concat(...Array.from(playerHands.values()));
		currentDeck.push(...commonCards);
		const callIsTrue = callInDeck(currentCall.call, currentDeck);

		if (callIsTrue) {
			await interaction.channel.send({
				content: `<@${currentCall.player}> was telling the truth! <@${buttonInteraction.user.id}> gains 1 card.`,
			});
			cardGainer = buttonInteraction.user.id;
			playerCardsEntitled.set(
				buttonInteraction.user.id,
				playerCardsEntitled.get(buttonInteraction.user.id) + 1
			);
		} else {
			await interaction.channel.send({
				content: `<@${currentCall.player}> was lying! They gain 1 card.`,
			});
			cardGainer = currentCall.player;
			playerCardsEntitled.set(
				currentCall.player,
				playerCardsEntitled.get(currentCall.player) + 1
			);
		}
		roundOver = true;
		hasCalled = true;
		msgCollector.stop();

		return;
	});

	msgCollector.on("collect", async message => {
		if (
			(message.author.id === interaction.user.id ||
				message.member.permissions.has(PermissionFlagsBits.ManageMessages)) &&
			!message.author.bot &&
			message.content.includes("abort")
		) {
			await message.reply({
				content: "Game aborted.",
			});
			aborted = true;
			hasCalled = true;
			msgCollector.stop();
			return;
		}
		if (message.author.id !== currentPlayer) return;
		const call = parseCall(message.content);
		if (!call || !call.call || (call.call as any) === -1) {
			// Call could not be parsed
			return;
		}
		if (currentCall) {
			if (!isHigher(call, currentCall.call)) {
				message.reply({
					content: `Your call is not higher than the current call (${formatCall(
						currentCall.call
					)}). Please try again.`,
				});
				return;
			}
		}
		if (
			call.call === HandRank.DoublePair ||
			call.call === HandRank.DoubleTriple
		) {
			const highCards = call.high as [Value, Value];
			if (highCards[0] === highCards[1]) {
				message.reply({
					content: `Double pairs and triples must have different values (Your call: ${formatCall(
						call
					)}). Please try again.`,
				});
				return;
			}
		}
		if (call.call === HandRank.TriplePair) {
			const highCards = call.high as [Value, Value, Value];
			if (
				highCards[0] === highCards[1] ||
				highCards[0] === highCards[2] ||
				highCards[1] === highCards[2]
			) {
				message.reply({
					content: `Triple pairs must have 3 unique values (Your call: ${formatCall(
						call
					)}). Please try again.`,
				});
				return;
			}
		}
		if (call.call === HandRank.DoubleFlush) {
			const highCards = call.high as [Card, Card];
			if (highCards[0].suit === highCards[1].suit) {
				message.reply({
					content: `Double flushes must have different suits (Your call: ${formatCall(
						call
					)}). Please try again.`,
				});
				return;
			}

			if (
				insuranceCount < 2 &&
				highCards[0].value === highCards[1].value &&
				highCards[0].value === 15
			) {
				message.reply({
					content: `There are not enough insurance cards in the deck for a double insurance call (Your call: ${formatCall(
						call
					)}). Please try again.`,
				});
				return;
			}
		}
		await msg.edit({
			content: msgContent,
			components: [getRow(true)],
		});
		currentCall = { call, player: currentPlayer };
		hasCalled = true;
		msgCollector.stop();
	});

	await collectorEnd(msgCollector);

	if (aborted) {
		gameMap.set(interaction.id, -2);
		return;
	}
	if (roundOver) {
		gameMap.set(interaction.id, players.indexOf(cardGainer));
		return;
	}

	if (!hasCalled) {
		await interaction.channel.send({
			content: `<@${currentPlayer}> failed to make a call in time. They gain a card and a new round will start now.`,
		});
		await msg.edit(msgContent);

		playerCardsEntitled.set(
			currentPlayer,
			playerCardsEntitled.get(currentPlayer) + 1
		);

		gameMap.set(interaction.id, players.indexOf(currentPlayer));
		return;
	}
	if (i >= players.length - 1) i = 0;
	else i++;

	await handlePlayerTurns(
		interaction,
		players,
		cardsToOut,
		playerHands,
		playerCardsEntitled,
		insuranceCount,
		commonCards,
		i,
		currentCall
	);
}

function collectorEnd(collector: MessageCollector) {
	return new Promise<void>(resolve =>
		collector.on("end", () => {
			resolve();
		})
	);
}

const royalFlushes = [
	[
		"hearts royal flush",
		"royal flush hearts",
		"royal hearts flush",
		"rfh",
		"rhf",
		"hrf",
	],
	[
		"diamonds royal flush",
		"royal flush diamonds",
		"royal diamonds flush",
		"rfd",
		"rdf",
		"drf",
	],
	[
		"clubs royal flush",
		"royal flush clubs",
		"royal clubs flush",
		"rfc",
		"rcf",
		"crf",
	],
	[
		"spades royal flush",
		"royal flush spades",
		"royal spades flush",
		"rfs",
		"rsf",
		"srf",
	],
];
function invalidNumber(x: any) {
	return Number.isNaN(x) || x == null;
}

function parseCall(call: string): Call | null {
	try {
		call = call.toLowerCase().trim();
		const royalIndex = royalFlushes.findIndex(x => x.includes(call));
		if (royalIndex !== -1) {
			switch (royalIndex) {
				case 0:
					return {
						high: { value: 14, suit: "H" },
						call: HandRank.StraightFlush,
					};
				case 1:
					return {
						high: { value: 14, suit: "D" },
						call: HandRank.StraightFlush,
					};
				case 2:
					return {
						high: { value: 14, suit: "C" },
						call: HandRank.StraightFlush,
					};
				case 3:
					return {
						high: { value: 14, suit: "S" },
						call: HandRank.StraightFlush,
					};
			}
		}
		const split = call.split(" ");

		const pairAppearances = split.filter(x =>
			names[RNI[HandRank.Pair]].includes(x)
		).length;

		if (pairAppearances === 2) {
			// double pair case
			// double pairs are asked like this: 2 pair 4 pair
			const high1 = symbolToValue(split[0]);
			if (invalidNumber(high1)) return null;
			const high2 = symbolToValue(split[2]);
			if (invalidNumber(high2)) return null;
			return {
				high: [high1, high2],
				call: HandRank.DoublePair,
			};
		}

		if (pairAppearances === 3) {
			// triple pair case
			// triple pairs are asked like this: 2 pair 4 pair 6 pair
			const high1 = symbolToValue(split[0]);
			if (invalidNumber(high1)) return null;
			const high2 = symbolToValue(split[2]);
			if (invalidNumber(high2)) return null;
			const high3 = symbolToValue(split[4]);
			if (invalidNumber(high3)) return null;
			return {
				high: [high1, high2, high3],
				call: HandRank.TriplePair,
			};
		}

		const tripleAppearances = split.filter(x =>
			names[RNI[HandRank.Triple]].includes(x)
		).length;
		if (tripleAppearances === 2) {
			// double triple case
			// double triples are asked like this: 2 triple 4 triple
			const high1 = symbolToValue(split[0]);
			if (invalidNumber(high1)) return null;
			const high2 = symbolToValue(split[2]);
			if (invalidNumber(high2)) return null;
			return {
				high: [high1, high2],
				call: HandRank.DoubleTriple,
			};
		}

		// Full Houses
		const tripleIndex = split.findIndex(x =>
			names[RNI[HandRank.Triple]].includes(x)
		);
		const pairIndex = split.findIndex(x =>
			names[RNI[HandRank.Pair]].includes(x)
		);
		if (tripleIndex !== -1 && pairIndex !== -1) {
			const indices = tripleIndex < pairIndex ? [0, 2] : [2, 0];
			const high1 = symbolToValue(split[indices[0]]);
			if (invalidNumber(high1)) return null;
			const high2 = symbolToValue(split[indices[1]]);
			if (invalidNumber(high2)) return null;
			return {
				high: [high1, high2],
				call: HandRank.FullHouse,
			};
		}

		const high = symbolToValue(split[0]);
		if (high === null) return null;
		const callName = split.slice(1).join(" ");
		const callIndex = names.findIndex(name => name.includes(callName));

		const call1 = split.findIndex(x => symbolToValue(x) !== null);
		const call2 = split.findLastIndex(x => symbolToValue(x) !== null);
		const c1c2good = call1 !== -1 && call2 !== -1 && call1 !== call2;
		// Split the call into 4 sections
		// Example call: A flush hearts K flush clubs -> ["A", "flush hearts", "K", "flush clubs"]
		// the indexes of the A and K are given in call1 and call2
		const newSplit = c1c2good
			? [
					split
						.slice(0, call1 + 1)
						.join(" ")
						.trim(),
					split
						.slice(call1 + 1, call2)
						.join(" ")
						.trim(),
					split
						.slice(call2, call2 + 1)
						.join(" ")
						.trim(),
					split
						.slice(call2 + 1)
						.join(" ")
						.trim(),
			  ]
			: null;
		const has = (index: number, x: string) =>
			names[index].some(y => x.startsWith(y));

		const flushAppearances = newSplit
			? newSplit
					.map((x): Suit => {
						if (has(RNI[HandRank.Flush], x)) return "H";
						if (has(RNI[HandRank.Flush + 1], x)) return "D";
						if (has(RNI[HandRank.Flush + 2], x)) return "C";
						if (has(RNI[HandRank.Flush + 3], x)) return "S";
						return null;
					})
					.filter(x => x !== null)
			: null;
		// Flushes
		if (
			(flushAppearances && flushAppearances.length > 0) ||
			(callIndex >= RNI[HandRank.Flush] && callIndex <= RNI[HandRank.FlushMax])
		) {
			if (flushAppearances && flushAppearances.length === 2) {
				// double flush case
				// double flushes are asked like this: 2 flush 4 flush
				const suit1 = flushAppearances[0];
				const suit2 = flushAppearances[1];

				const high1 = symbolToValue(newSplit[0]);
				if (invalidNumber(high1)) return null;
				const high2 = symbolToValue(newSplit[2]);
				if (invalidNumber(high2)) return null;

				return {
					high: [
						{ value: high1, suit: suit1 },
						{ value: high2, suit: suit2 },
					],
					call: HandRank.DoubleFlush,
				};
			}

			let suit: Suit;
			switch (callIndex - RNI[HandRank.Flush]) {
				case 0:
					suit = "H";
					break;
				case 1:
					suit = "D";
					break;
				case 2:
					suit = "C";
					break;
				case 3:
					suit = "S";
					break;
				default:
					suit = "n";
					break;
			}
			return {
				high: { value: high, suit },
				call: HandRank.Flush,
			};
		}
		// Straight Flushes
		if (
			callIndex >= RNI[HandRank.StraightFlush] &&
			callIndex <= RNI[HandRank.StraightFlushMax]
		) {
			let suit: Suit;
			switch (callIndex - RNI[HandRank.StraightFlush]) {
				case 0:
					suit = "H";
					break;
				case 1:
					suit = "D";
					break;
				case 2:
					suit = "C";
					break;
				case 3:
					suit = "S";
					break;
				default:
					suit = "n";
					break;
			}
			return {
				high: { value: high, suit },
				call: HandRank.StraightFlush,
			};
		}

		return {
			high: { value: high, suit: "n" },
			call: RNIKeys.find(key => RNI[key] === callIndex),
		};
	} catch (e) {
		return null;
	}
}

// convert text to value, e.g. "2" -> 2, "Joker" -> 0, "K" or "King" -> 13
function symbolToValue(textGiven: string): Value | null {
	const text = textGiven.toLowerCase();
	if (text === "joker" || text === "x") return 0;
	if (text === "insurance" || text === "i") return 15;
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
function capitalize(text: string) {
	return text
		.split(" ")
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}
function callNumberToName(call: HandRank) {
	return capitalize(names[RNI[call]][0]);
}

// create a function that takes in 2 arrays of equal sizes
// and returns whether the first array is "higher" than the second array
// higher means that the elements of the first array are all greater than or equal to the elements of the second array
// but if all the elements are equal, it is false
function isHigherArray(arr1: number[], arr2: number[]) {
	for (let i = 0; i < arr1.length; i++) {
		if (arr1[i] < arr2[i]) return false;
	}
	if (arr1.every((x, i) => x === arr2[i])) return false;
	return true;
}

// returns whether call1 is a higher call than call2
function isHigher(call1: Call, call2: Call) {
	const call_call1 = call1.call;
	const call_call2 = call2.call;
	if (call_call1 > call_call2) return true;
	if (call_call1 < call_call2) return false;
	if (
		call_call1 === HandRank.DoublePair ||
		call_call1 === HandRank.FullHouse ||
		call_call1 === HandRank.DoubleTriple ||
		call_call1 === HandRank.TriplePair
	) {
		const arr1 = (call1.high as Value[]).sort();
		const arr2 = (call2.high as Value[]).sort();
		return isHigherArray(arr1, arr2);
	}
	if (call_call1 === HandRank.DoubleFlush) {
		const arr1 = (call1.high as [Card, Card]).map(card => card.value).sort();
		const arr2 = (call2.high as [Card, Card]).map(card => card.value).sort();
		return isHigherArray(arr1, arr2);
	}
	const call1_high = (call1.high as Card).value;
	const call2_high = (call2.high as Card).value;
	if (call_call1 !== HandRank.Flush) return call1_high > call2_high;
	return call1_high < call2_high;
}

function formatCall(call: Call) {
	if (call.call === HandRank.StraightFlush && call.high.value === 14) {
		switch (call.high.suit) {
			case "H":
				return `Royal Flush${emoji.hearts}`;
			case "D":
				return `Royal Flush${emoji.diamonds}`;
			case "C":
				return `Royal Flush${emoji.clubs}`;
			case "S":
				return `Royal Flush${emoji.spades}`;
			default:
				return "Royal Flush (Unknown Suit)";
		}
	}
	if (call.call === HandRank.DoublePair) {
		return `${valueToSymbol(call.high[0])} Pair ${valueToSymbol(
			call.high[1]
		)} Pair`;
	}
	if (call.call === HandRank.FullHouse) {
		return `${valueToSymbol(call.high[0])} Triple ${valueToSymbol(
			call.high[1]
		)} Pair`;
	}
	if (call.call === HandRank.TriplePair) {
		return `${valueToSymbol(call.high[0])} Pair ${valueToSymbol(
			call.high[1]
		)} Pair ${valueToSymbol(call.high[2])} Pair`;
	}
	if (call.call === HandRank.DoubleTriple) {
		return `${valueToSymbol(call.high[0])} Triple ${valueToSymbol(
			call.high[1]
		)} Triple`;
	}
	if (call.call === HandRank.Flush) {
		return `${valueToSymbol(call.high.value)} Flush${suitToEmoji(
			call.high.suit
		)}`;
	}
	if (call.call === HandRank.StraightFlush) {
		return `${valueToSymbol(call.high.value)} Straight Flush${suitToEmoji(
			call.high.suit
		)}`;
	}
	if (call.call === HandRank.DoubleFlush) {
		return `${valueToSymbol(
			(call.high as [Card, Card])[0].value
		)} Flush${suitToEmoji((call.high as [Card, Card])[0].suit)} ${valueToSymbol(
			(call.high as [Card, Card])[1].value
		)} Flush${suitToEmoji((call.high as [Card, Card])[1].suit)}`;
	}

	return `${valueToSymbol((call.high as Card).value)} ${callNumberToName(
		call.call
	)}`;
}

function callInDeck(call: Call, deck: Deck) {
	if (call.call === HandRank.High)
		return deck.some(card => card.value === call.high.value);
	if (call.call === HandRank.Pair)
		return deck.filter(card => card.value === call.high.value).length >= 2;
	if (call.call === HandRank.DoublePair)
		return (
			deck.filter(card => card.value === call.high[0]).length >= 2 &&
			deck.filter(card => card.value === call.high[1]).length >= 2
		);
	if (call.call === HandRank.Triple)
		return deck.filter(card => card.value === call.high.value).length >= 3;
	if (call.call === HandRank.Straight) {
		const straightCards = straightHighToCards(call.high.value);
		return straightCards.every(value =>
			deck.some(card => card.value === value)
		);
	}
	if (call.call === HandRank.FullHouse)
		return (
			deck.filter(card => card.value === call.high[0]).length >= 3 &&
			deck.filter(card => card.value === call.high[1]).length >= 2
		);
	if (call.call === HandRank.Quad)
		return deck.filter(card => card.value === call.high.value).length >= 4;
	if (call.call === HandRank.Flush) {
		if (call.high.value === 15) {
			return (
				deck.some(card => card.value === 15) &&
				deck.filter(card => card.suit === call.high.suit || card.suit === "j")
					.length >= 4
			);
		}
		return (
			deck.filter(
				card =>
					(card.suit === call.high.suit || card.suit === "j") &&
					card.value <= call.high.value
			).length >= 5
		);
	}
	if (call.call === HandRank.DoubleFlush) {
		return (call.high as [Card, Card]).every(card => {
			if (card.value === 15) {
				return (
					deck.some(card => card.value === 15) &&
					deck.filter(card => card.suit === card.suit || card.suit === "j")
						.length >= 4
				);
			}
			return (
				deck.filter(
					c => (c.suit === card.suit || c.suit === "j") && c.value <= card.value
				).length >= 5
			);
		});
	}
	if (call.call === HandRank.StraightFlush) {
		const straightCards = straightHighToCards(call.high.value);
		return straightCards.every(value =>
			deck.some(
				card =>
					card.value === value &&
					card.suit === (value === 15 ? "i" : call.high.suit)
			)
		);
	}
}

// create a function to convert the high card of a straight to a list of 5 cards for the straight
// e.g. if the top value is 14, it should return 14, 13, 12, 11, 10
// if the top value is 2, it will return 2, 14, 13, 12, 11 (wrap-around)
function straightHighToCards(high: Value): Value[] {
	if (high === 15) return [15, 14, 13, 12, 11];
	if (high === 0) return [0, 14, 13, 12, 11];
	const cards: Value[] = [];
	for (let i = 0; i < 5; i++) {
		cards.push(<Value>(((high - 1 - i + 13) % 13 || 13) + 1));
	}
	return cards;
}
