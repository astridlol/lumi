import { client, prisma } from '..';
import * as cron from 'node-cron';
import * as Embeds from '../constants/Embeds';
import { ButtonBuilder } from '@discordjs/builders';
import { ActionRowBuilder, ButtonStyle } from 'discord.js';
import * as LumiUtils from '../lib/Lumi';

cron.schedule('*/15 * * * *', async () => babyAging());

babyAging();

async function babyAging() {
	const allBabyLumi = await prisma.lumi.findMany({
		where: {
			age: {
				lte: 4
			}
		}
	});

	allBabyLumi.forEach(async (f) => {
		const embed = Embeds.success()
			.setTitle(`Happy birthday ${f.name}!`)
			.setDescription(`${f.name} is now ${f.age}! Wish them a happy birthday below.`);
		const wish = new ButtonBuilder()
			.setCustomId('praise')
			.setStyle(ButtonStyle.Success)
			.setLabel('Wish Happy Birthday')
			.setEmoji({
				name: '🎂'
			});
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(wish);

		const user = await client.users.fetch(f.playerId);
		try {
			await user.send({
				embeds: [embed],
				components: [row]
			});
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
