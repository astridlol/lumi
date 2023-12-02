import { ButtonComponent, Discord, Guard } from 'discordx';
import { RequireLumi } from '../guards/RequireLumi';
import { ButtonInteraction } from 'discord.js';
import { globalCache, prisma } from '..';
import * as Embeds from '../constants/Embeds';
import * as LumiUtils from '../lib/Lumi';

@Discord()
@Guard(RequireLumi)
export class Praise {
	@ButtonComponent({
		id: 'praise'
	})
	async handlePraise(interaction: ButtonInteraction) {
		if (globalCache.has(`recentPraise_${interaction.user.id}`)) return interaction.deferUpdate();
		else
			await interaction.deferReply({
				ephemeral: true
			});

		const lumi = await prisma.lumi.findUnique({
			where: {
				playerId: interaction.user.id
			}
		});

		const stats = await prisma.lumiStats.findUnique({
			where: {
				lumiId: lumi.id
			}
		});

		// Checks to make sure health nor happiness exceeds 100.
		const updateData: any = {};
		if (stats.happiness + 5 < 100)
			updateData.happiness = {
				increment: 5
			};
		if (stats.health + 5 < 100)
			updateData.health = {
				increment: 5
			};

		if (!updateData.health && !updateData.happiness) {
			const embed = Embeds.error()
				.setTitle(`${lumi.name} is already well!`)
				.setDescription(
					`${lumi.name} is experiencing praise overload due to their stats being maxed out`
				);
			interaction.editReply({
				embeds: [embed]
			});
			return;
		}

		await prisma.lumiStats.update({
			where: {
				lumiId: lumi.id
			},
			data: updateData
		});

		interaction.editReply({
			content: `You've praised ${lumi.name} and increased both their happiness and health!`
		});

		LumiUtils.modifyCoins(interaction.user.id, 10, 'increment');

		globalCache.set(`recentPraise_${interaction.user.id}`, true, 60 * 10);
	}
}
