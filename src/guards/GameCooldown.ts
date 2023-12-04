import { ButtonInteraction, CommandInteraction } from 'discord.js';
import { GuardFunction } from 'discordx';
import { globalCache, prisma } from '..';
import * as Embeds from '../constants/Embeds';

// Note: "why isn't this just in the base game command":
// Because then I'd have to do duplicated logic to make buttons not spamable.

export const GameCooldown: GuardFunction<CommandInteraction | ButtonInteraction> = async (
	interaction,
	_,
	next
) => {
	const cacheKey = `recentlyPlayed_${interaction.user.id}`;
	if (globalCache.has(cacheKey)) {
		const lumi = await prisma.lumi.findUnique({
			where: {
				playerId: interaction.user.id
			}
		});

		const embed = Embeds.error()
			.setTitle('Uh oh')
			.setDescription(`${lumi.name} is a bit worn out, ask again later.`);
		await interaction.reply({
			embeds: [embed],
			ephemeral: true
		});
		return;
	}

	globalCache.set(cacheKey, true, 60 * 10);

	return await next();
};
