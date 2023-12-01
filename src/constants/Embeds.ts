import { EmbedBuilder } from 'discord.js';
import Colors from './Colors';

const error = (message: string) => {
	const embed = new EmbedBuilder().setColor(Colors.red).setDescription(message);
	return embed;
};

const success = (message: string) => {
	const embed = new EmbedBuilder()
		.setColor(Colors.green)
		.setTitle('Success')
		.setDescription(message);
	return embed;
};

const info = () => {
	const embed = new EmbedBuilder().setColor(Colors.purple);
	return embed;
};

export { success, error, info };
