import { CommandInteraction } from 'discord.js';
import { GuardFunction } from 'discordx';
import { prisma } from '..';
import { getCommand } from '../lib/General';

export const RequireLumi: GuardFunction<CommandInteraction> = async (interaction, _, next) => {
	const player = await prisma.player.findUnique({
		where: {
			id: interaction.user.id
		}
	});

	if (player == null || player.lumi == null) {
		const adopt = await getCommand('adopt');

		await interaction.reply({
			content: `You don't have a Lumi yet! You can adopt one using </adopt:${adopt.id}>`,
			ephemeral: true
		});
		return;
	} else return await next();
};
