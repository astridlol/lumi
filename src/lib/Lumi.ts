import { Lumi } from '@prisma/client';
import { prisma } from '..';

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

	if (action == 'increment' && stats.happiness >= 100) return false;
	if (action == 'decrement' && stats.happiness <= 0) return false;

	const updateData: {
		increment?: number;
		decrement?: number;
	} = {};

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

	const updateData: {
		increment?: number;
		decrement?: number;
	} = {};

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

async function isWilling(lumi: Lumi) {
	const where = {
		lumiId: lumi.id
	};

	const stats = await prisma.lumiStats.findUnique({
		where
	});

	const chance = Math.random();
	return chance < stats.sportsmanship.toNumber();
}

export { modifyHappiness, modifyHealth, isWilling };
