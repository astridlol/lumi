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

const unexpected = () => {
	return error()
		.setTitle('Uh oh!')
		.setDescription('Lumi encountered an unexpected error. Please try again later!');
};

export { success, error, info, unexpected };
