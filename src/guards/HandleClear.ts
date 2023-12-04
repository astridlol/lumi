import { SelectMenuInteraction } from 'discord.js';
import { GuardFunction } from 'discordx';

export const HandleClear: GuardFunction<SelectMenuInteraction> = async (interaction, _, next) => {
	const value = interaction.values[0];

	if (value == '_ignore_') {
		await interaction.deferUpdate();
		return;
	}

	return await next();
};
