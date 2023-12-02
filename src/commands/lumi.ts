import {
	ButtonComponent,
	Discord,
	Guard,
	Slash,
	SlashChoice,
	SlashGroup,
	SlashOption
} from 'discordx';
import {
	ActionRowBuilder,
	ApplicationCommandOptionType,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	CommandInteraction
} from 'discord.js';
import * as Embeds from '../constants/Embeds';
import { prisma } from '..';
import NodeCache from 'node-cache';
import { RequireLumi } from '../guards/RequireLumi';
import { Lumi } from '@prisma/client';

type LumiGames = 'rps' | 'walking';

const cache = new NodeCache({ stdTTL: 60 });

@Discord()
@Guard(RequireLumi)
@SlashGroup({ description: 'Manage your Lumi', name: 'lumi' })
@SlashGroup('lumi')
class LumiCommand {
	@Slash({ description: 'Play with your lumi' })
	async play(
		@SlashChoice({ name: 'Rock paper scisors', value: 'rps' })
		@SlashOption({
			description: 'What game?',
			name: 'game',
			required: true,
			type: ApplicationCommandOptionType.String
		})
		game: LumiGames,
		interaction: CommandInteraction
	) {
		await interaction.deferReply({ ephemeral: true });
		switch (game) {
			case 'rps': {
				this.playRPS(interaction);
				break;
			}
		}
	}

	private async playRPS(interaction: CommandInteraction) {
		cache.set(`playingRPS_${interaction.user.id}`, true);

		const rock = new ButtonBuilder()
			.setCustomId('rps_rock')
			.setStyle(ButtonStyle.Secondary)
			.setEmoji('🪨');
		const paper = new ButtonBuilder()
			.setCustomId('rps_paper')
			.setStyle(ButtonStyle.Secondary)
			.setEmoji('📄');
		const scisors = new ButtonBuilder()
			.setCustomId('rps_scissors')
			.setStyle(ButtonStyle.Secondary)
			.setEmoji('✂️');
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(rock, paper, scisors);

		const embed = Embeds.info()
			.setTitle('Rock paper scisors')
			.setDescription('Select your choice below, choose wisely!');

		interaction.editReply({
			embeds: [embed],
			components: [row]
		});
	}

	private async modifyHappiness(
		lumi: Lumi,
		amount: number,
		action: 'increment' | 'decrement'
	): Promise<boolean> {
		const where = {
			lumiId: lumi.id
		};

		const stats = await prisma.lumiStats.findUnique({
			where
		});

		if (action == 'increment' && stats.happiness >= 100) return false;
		if (action == 'decrement' && stats.happiness <= 0) return false;

		const updateData: {
			increment?: number;
			decrement?: number;
		} = {};

		if (action == 'increment') updateData.increment = amount;
		else updateData.decrement = amount;

		await prisma.lumiStats.update({
			where,
			data: {
				happiness: updateData
			}
		});

		return true;
	}

	@ButtonComponent({
		id: /rps_(rock|paper|scissors)/
	})
	async handleRPSGame(interaction: ButtonInteraction) {
		const cacheKey = `playingRPS_${interaction.user.id}`;
		if (!cache.get(cacheKey)) {
			await interaction.deferUpdate();
			return;
		}
		cache.del(cacheKey);

		// only used so i don't have to specify ephemeral for each message :sob:
		await interaction.deferReply({
			ephemeral: true
		});

		const choices = ['rock', 'paper', 'scissors'];
		const choice = choices[Math.floor(Math.random() * choices.length)];
		const playedChoice = interaction.customId.split('_').pop();

		const lumi = await prisma.lumi.findUnique({
			where: {
				playerId: interaction.user.id
			}
		});

		if (choice === playedChoice) {
			const tieEmbed = Embeds.info()
				.setTitle("It's a tie!")
				.setDescription(`You and ${lumi.name} both chose ${playedChoice}!`);
			await interaction.editReply({ embeds: [tieEmbed] });
			return;
		}

		const winningConditions = {
			rock: 'scissors',
			scissors: 'paper',
			paper: 'rock'
		};

		if (winningConditions[choice] === playedChoice) {
			const lumiWon = Embeds.success()
				.setTitle(`${lumi.name} won!`)
				.setDescription(`${choice} beats ${playedChoice}!`);

			const modifed = this.modifyHappiness(lumi, 2, 'increment');
			if (modifed) lumiWon.setFooter({ text: `+2 Happiness c:` });

			await interaction.editReply({ embeds: [lumiWon] });
			return;
		}

		const youWon = Embeds.error()
			.setTitle(`You won!`)
			.setDescription(`${playedChoice} beats ${choice}!`);

		const modifed = this.modifyHappiness(lumi, 2, 'decrement');
		if (modifed) youWon.setFooter({ text: `-2 Happiness >:(` });

		await interaction.editReply({ embeds: [youWon] });
	}
}
