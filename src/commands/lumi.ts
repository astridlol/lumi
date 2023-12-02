require('toml-require').install();

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
	AutocompleteInteraction,
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
import { getCommand, prettify, removeOne } from '../lib/General';
import Food from '../interfaces/Food';
import Responses from '../interfaces/Responses';
const allFood: Food = require('../constants/Food.toml');
const allResponses: Responses = require('../constants/Responses.toml');

type LumiGames = 'rps' | 'walking';

const cache = new NodeCache({ stdTTL: 60 });

@Discord()
@Guard(RequireLumi)
@SlashGroup({ description: 'Manage your Lumi', name: 'lumi' })
@SlashGroup('lumi')
class LumiCommand {
	@Slash({ description: 'Disown your Lumi :(' })
	async disown(interaction: CommandInteraction) {
		await interaction.deferReply({
			ephemeral: true
		});

		const lumi = await prisma.lumi.findUnique({
			where: {
				playerId: interaction.user.id
			}
		});

		const randomResponse =
			allResponses.disown[Math.floor(Math.random() * allResponses.disown.length)];
		const embed = Embeds.error()
			.setTitle('Are you sure?')
			.setDescription(`${lumi.name}: ${randomResponse}`)
			.setFooter({
				text: `This is not reverisble! | All Lumi data will be wiped.`
			});

		const disown = new ButtonBuilder()
			.setCustomId('disown')
			.setStyle(ButtonStyle.Danger)
			.setLabel(`Disown ${lumi.name}`);

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(disown);

		interaction.editReply({
			embeds: [embed],
			components: [row]
		});
	}

	@Slash({ description: 'Feed your Lumi' })
	async feed(
		@SlashOption({
			autocomplete: async function (interaction: AutocompleteInteraction) {
				const player = await prisma.player.findUnique({
					where: {
						id: interaction.user.id
					}
				});
				const food = player.food as string[];
				interaction.respond(
					food.map((item) => {
						return { name: prettify(item), value: item };
					})
				);
			},
			description: 'The food to give',
			name: 'food',
			required: true,
			type: ApplicationCommandOptionType.String
		})
		foodItem: string,
		interaction: CommandInteraction
	) {
		interaction.deferReply({
			ephemeral: true
		});
		const lumi = await prisma.lumi.findUnique({
			where: {
				playerId: interaction.user.id
			}
		});

		const fedRecently = cache.get(`recentlyFed_${lumi.id}`);

		if (fedRecently) {
			const embed = Embeds.error()
				.setTitle(`${lumi.name} was fed recently!`)
				.setDescription(`You've already fed ${lumi.name} recently, come back later.`);
			await interaction.editReply({
				embeds: [embed]
			});
			return;
		}

		const player = await prisma.player.findUnique({
			where: {
				id: interaction.user.id
			}
		});

		const foodData = allFood[foodItem];
		console.log(foodData);
		if (!foodData) {
			interaction.editReply({
				embeds: [Embeds.unexpected()]
			});
			return;
		}
		const modifiedHealth = this.modifyHealth(lumi, foodData.healthPoints, 'increment');

		if (modifiedHealth) {
			// prevent from feeding for 30 minutes
			cache.set(`recentlyFed_${lumi.id}`, true, 60 * 30);
			const randomResponse = allResponses.fed[Math.floor(Math.random() * allResponses.fed.length)];

			const embed = Embeds.success()
				.setTitle('Yummy!')
				.setDescription(`${lumi.name}: ${randomResponse}`);
			await interaction.editReply({
				embeds: [embed]
			});

			const newFood = removeOne(player.food as string[], foodItem);
			await prisma.player.update({
				where: {
					id: interaction.user.id
				},
				data: {
					food: newFood
				}
			});

			return;
		}

		interaction.editReply({
			content: `${lumi.name}: I'm already at max health, silly!`
		});
	}

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

	@ButtonComponent({
		id: 'disown'
	})
	async handleDisown(interaction: ButtonInteraction) {
		await interaction.deferReply({
			ephemeral: true
		});
		const lumi = await prisma.lumi.findUnique({
			where: {
				playerId: interaction.user.id
			}
		});

		await prisma.lumiStats.delete({
			where: {
				lumiId: lumi.id
			}
		});

		await prisma.lumi.delete({
			where: {
				id: lumi.id
			}
		});

		await prisma.player.update({
			where: {
				id: interaction.user.id
			},
			data: {
				lumi: null
			}
		});

		const adopt = await getCommand('adopt');
		const embed = Embeds.success()
			.setTitle('Bye bye')
			.setDescription(
				`${lumi.name} has been sent back to the adoption center. If you're ever up for it again, use </adopt:${adopt.id}>.`
			);

		await interaction.editReply({
			embeds: [embed]
		});
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

	private async modifyHealth(
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

		if (action == 'increment' && stats.health >= 100) return false;
		if (action == 'decrement' && stats.health <= 0) return false;

		const updateData: {
			increment?: number;
			decrement?: number;
		} = {};

		if (action == 'increment') updateData.increment = amount;
		else updateData.decrement = amount;

		await prisma.lumiStats.update({
			where,
			data: {
				health: updateData
			}
		});

		return true;
	}
}
