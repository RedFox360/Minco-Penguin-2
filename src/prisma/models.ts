import { prisma } from "../main.js";
import { Prisma } from "@prisma/client";

export function getProfile(userId: string) {
	return prisma.profile.upsert({
		where: {
			userId: userId,
		},
		update: {},
		create: {
			userId: userId,
			mincoDollars: 1000,
			bank: 0,
			bsPokerWins: 0,
			bsPokerGamesPlayed: 0,
			bsPokerRating: 0.0,
		},
	});
}

export async function updateProfile(
	userId: string,
	data: Prisma.ProfileUpdateInput,
	upsert = true
) {
	if (upsert) await getProfile(userId);
	return prisma.profile.update({
		where: {
			userId: userId,
		},
		data: data,
	});
}
