import { Lumi } from '@prisma/client';
import { prisma } from '..';

type UpdateData = {
	increment?: number;
	decrement?: number;
};

async function modifyHappiness(
	lumi: Lumi,
	amount: number,
	action: 'increment' | 'decrement'
): Promise<boolean> {
	const where = {
		lumiId: lumi.id
	};

	const stats = await prisma.lumiStats.findUnique({
		where
	});

	if (action == 'increment' && stats.happiness + amount >= 100) return false;
	if (action == 'decrement' && stats.happiness - amount <= 0) return false;

	const updateData: UpdateData = {};

	if (action == 'increment') updateData.increment = amount;
	else updateData.decrement = amount;

	await prisma.lumiStats.update({
		where,
		data: {
			happiness: updateData
		}
	});

	return true;
}

async function modifyHealth(
	lumi: Lumi,
	amount: number,
	action: 'increment' | 'decrement'
): Promise<boolean> {
	const where = {
		lumiId: lumi.id
	};

	const stats = await prisma.lumiStats.findUnique({
		where
	});

	if (action == 'increment' && stats.health >= 100) return false;
	if (action == 'decrement' && stats.health <= 0) return false;

	const updateData: UpdateData = {};

	if (action == 'increment') updateData.increment = amount;
	else updateData.decrement = amount;

	await prisma.lumiStats.update({
		where,
		data: {
			health: updateData
		}
	});

	return true;
}

async function modifyCoins(
	playerId: string,
	amount: number,
	action: 'increment' | 'decrement'
): Promise<void> {
	const updateData: UpdateData = {};

	if (action == 'increment') updateData.increment = amount;
	else updateData.decrement = amount;

	await prisma.player.update({
		where: {
			id: playerId
		},
		data: {
			lumicoins: updateData
		}
	});
}

async function isWilling(lumi: Lumi) {
	const stats = await prisma.lumiStats.findUnique({
		where: {
			lumiId: lumi.id
		}
	});

	const chance = Math.random();
	return chance < stats.sportsmanship.toNumber();
}

export { modifyHappiness, modifyHealth, modifyCoins, isWilling };
