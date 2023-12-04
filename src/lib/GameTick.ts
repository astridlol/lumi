import { client, prisma } from '..';
import * as cron from 'node-cron';
import * as Embeds from '../constants/Embeds';
import { ButtonBuilder } from '@discordjs/builders';
import { ActionRowBuilder, ButtonStyle, MessageCreateOptions } from 'discord.js';
import * as LumiUtils from './Lumi';
import { Lumi } from '@prisma/client';

cron.schedule('*/15 * * * *', async () => babyAging());
cron.schedule('*/30 * * * *', async () => healthTick());
cron.schedule('0 * * * *', async () => typicalAging());

const getBdayEmbed = (lumi: Lumi): MessageCreateOptions => {
	const embed = Embeds.success()
		.setTitle(`Happy birthday ${lumi.name}!`)
		.setDescription(`${lumi.name} is now ${lumi.age}! Wish them a happy birthday below.`);
	const wish = new ButtonBuilder()
		.setCustomId('praise')
		.setStyle(ButtonStyle.Success)
		.setLabel('Wish Happy Birthday')
		.setEmoji({
			name: '🎂'
		});
	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(wish);

	return {
		embeds: [embed],
		components: [row]
	};
};

async function healthTick() {
	const allLumi = await prisma.lumi.findMany();

	allLumi.forEach(async (l) => {
		let response: boolean;
		if (l.age < 20) response = await LumiUtils.modifyHealth(l, 5, 'decrement');
		else response = await LumiUtils.modifyHealth(l, 2, 'decrement');
		if (!response) await handleLumiDeath(l, 'due to lack of food');
	});
}

async function babyAging() {
	const where = {
		age: {
			lte: 4
		}
	};

	const allBabyLumi = await prisma.lumi.findMany({
		where
	});

	allBabyLumi.forEach(async (f) => {
		LumiUtils.modifyCoins(f.playerId, 2, 'increment');

		const user = await client.users.fetch(f.playerId);
		try {
			await user.send(getBdayEmbed(f));
		} catch (err) {
			console.log(err);
			// If the DM failed to send, the user has probably blocked Lumi. Decrement 20 happiness points, as that's just harsh.
			LumiUtils.modifyHappiness(f, 20, 'decrement');
		}
	});

	await prisma.lumi.updateMany({
		where,
		data: {
			age: {
				increment: 1
			}
		}
	});
}

// TODO: eventually refactor this
async function typicalAging() {
	await prisma.lumi.updateMany({
		where: {
			age: {
				gte: 4
			}
		},
		data: {
			age: {
				increment: 1
			}
		}
	});

	const elderlyThreshold = 60;
	const elderLumiCount = await prisma.lumi.count({
		where: {
			age: {
				gte: elderlyThreshold
			}
		}
	});

	if (elderLumiCount === 0) return;
	const randomLumi = await prisma.lumi.findFirst({
		where: {
			age: {
				gte: elderlyThreshold
			}
		},
		skip: Math.floor(Math.random() * elderLumiCount)
	});

	if (!randomLumi) return;

	await handleLumiDeath(randomLumi);
}

async function handleLumiDeath(lumi: Lumi, reason = 'due to natural causes') {
	const user = await client.users.fetch(lumi.playerId);
	const embed = Embeds.error()
		.setTitle('Rest in peace 💀')
		.setDescription(`${lumi.name} passed away ${reason}.`);
	await user.send({
		embeds: [embed]
	});
	await LumiUtils.disownLumi(lumi.playerId);
}
