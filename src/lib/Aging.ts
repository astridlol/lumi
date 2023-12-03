import { client, prisma } from '..';
import * as cron from 'node-cron';
import * as Embeds from '../constants/Embeds';
import { ButtonBuilder } from '@discordjs/builders';
import { ActionRowBuilder, ButtonStyle, MessageCreateOptions } from 'discord.js';
import * as LumiUtils from '../lib/Lumi';
import { Lumi } from '@prisma/client';

cron.schedule('*/15 * * * *', async () => babyAging());

babyAging();

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

async function babyAging() {
	const allBabyLumi = await prisma.lumi.findMany({
		where: {
			age: {
				lte: 4
			}
		}
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
		where: {
			age: {
				lte: 4
			}
		},
		data: {
			age: {
				increment: 1
			}
		}
	});
}
