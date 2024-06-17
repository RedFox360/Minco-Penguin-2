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
