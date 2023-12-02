import { EmbedBuilder } from 'discord.js';
import Colors from './Colors';

const error = () => {
	const embed = new EmbedBuilder().setColor(Colors.red);
	return embed;
};

const success = () => {
	const embed = new EmbedBuilder().setColor(Colors.green);
	return embed;
};

const info = () => {
	const embed = new EmbedBuilder().setColor(Colors.purple);
	return embed;
};

export { success, error, info };
