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
import { globalCache, prisma } from '..';
import { RequireLumi } from '../guards/RequireLumi';
import { getCommand, getRandomResponse, prettify, removeOne, sleep } from '../lib/General';
import Food from '../interfaces/Food';
import Responses from '../interfaces/Responses';
import dayjs from 'dayjs';
import * as LumiUtils from '../lib/Lumi';
const allFood: Food = require('../constants/Food.toml');
const allResponses: Responses = require('../constants/Responses.toml');

type LumiGames = 'rps' | 'snow';

@Discord()
@Guard(RequireLumi)
@SlashGroup({ description: 'Manage your Lumi', name: 'lumi' })
@SlashGroup('lumi')
export class LumiCommand {
	@Slash({ description: 'View stats for your Lumi' })
	async stats(interaction: CommandInteraction) {
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

		const happinessEmoji = () => {
			if (stats.happiness > 90) return ':grin:';
			if (stats.happiness > 70) return ':slight_smile:';
			if (stats.happiness > 50) return ':rolling_eyes:';
			if (stats.happiness > 30) return ':sob:';
			else return ':rage:';
		};

		const ageEmoji = () => {
			if (lumi.age < 4) return ':baby_bottle:';
			if (lumi.age < 13) return ':child:';
			if (lumi.age > 18) return ':star_struck:';
			if (lumi.age > 60) return ':older_adult:';
			else return ':skull:';
		};

		const adopted = dayjs(lumi.birthday).unix();

		const embed = Embeds.success().setTitle('Statistics');
		embed.setFields([
			{
				name: 'Name',
				value: lumi.name,
				inline: true
			},
			{
				name: 'Health',
				value: `${stats.health} :heart:`,
				inline: true
			},
			{
				name: 'Happiness',
				value: `${stats.happiness} ${happinessEmoji()}`,
				inline: true
			},
			{
				name: 'Age',
				value: `${lumi.age} ${ageEmoji()}`,
				inline: true
			},
			{
				name: 'Adopted',
				value: `<t:${adopted}:R> (<t:${adopted}:f>)`
			}
		]);

		interaction.editReply({
			embeds: [embed]
		});
	}

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

		const randomResponse = getRandomResponse(allResponses.disown, interaction.user);
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

		const fedRecently = globalCache.get(`recentlyFed_${lumi.id}`);

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
		if (!foodData) {
			interaction.editReply({
				embeds: [Embeds.unexpected()]
			});
			return;
		}
		const modifiedHealth = LumiUtils.modifyHealth(lumi, foodData.healthPoints, 'increment');

		if (modifiedHealth) {
			// prevent from feeding for 30 minutes
			globalCache.set(`recentlyFed_${lumi.id}`, true, 60 * 30);
			const response = getRandomResponse(allResponses.fed, interaction.user);
			const embed = Embeds.success().setTitle('Yummy!').setDescription(`${lumi.name}: ${response}`);
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
		@SlashChoice({ name: 'Play in the snow', value: 'snow' })
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
			interaction.editReply({
				embeds: [embed]
			});
			return;
		}
		globalCache.set(cacheKey, true, 60 * 10);

		switch (game) {
			case 'rps': {
				this.playRPS(interaction);
				break;
			}
			case 'snow': {
				this.playInSnow(interaction);
				break;
			}
		}
	}

	private async playRPS(interaction: CommandInteraction) {
		globalCache.set(`playingRPS_${interaction.user.id}`, true);

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

	private async playInSnow(interaction: CommandInteraction) {
		const lumi = await prisma.lumi.findUnique({
			where: {
				playerId: interaction.user.id
			}
		});

		interaction.editReply({
			content: `You take ${lumi.name} out to play in the snow...`
		});

		await sleep(1000);

		const isFeelingSnow = LumiUtils.isWilling(lumi);

		if (!isFeelingSnow) {
			await LumiUtils.modifyHappiness(lumi, 10, 'decrement');
			const embed = Embeds.error()
				.setTitle(`${lumi.name} is not up for snow today`)
				.setDescription(
					`${lumi.name} says:\n> ${getRandomResponse(allResponses.noSnow, interaction.user)}`
				)
				.setFooter({
					text: '-10 Happiness'
				});
			await interaction.editReply({
				content: null,
				embeds: [embed]
			});
			return;
		}

		await LumiUtils.modifyHappiness(lumi, 10, 'increment');
		const embed = Embeds.success()
			.setTitle(`Yay!`)
			.setDescription(
				`${lumi.name} says:\n> ${getRandomResponse(allResponses.snowPlay, interaction.user)}`
			)
			.setFooter({
				text: '+10 Happiness'
			});
		await interaction.editReply({
			content: null,
			embeds: [embed]
		});
		return;
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
		if (!globalCache.get(cacheKey)) {
			await interaction.deferUpdate();
			return;
		}
		globalCache.del(cacheKey);

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

			const modifed = LumiUtils.modifyHappiness(lumi, 2, 'increment');
			if (modifed) lumiWon.setFooter({ text: `+2 Happiness c:` });

			await interaction.editReply({ embeds: [lumiWon] });
			return;
		}

		const youWon = Embeds.error()
			.setTitle(`You won!`)
			.setDescription(`${playedChoice} beats ${choice}!`);

		const isGoodSport = LumiUtils.isWilling(lumi);
		if (!isGoodSport) {
			const modifed = LumiUtils.modifyHappiness(lumi, 2, 'decrement');
			if (modifed) youWon.setFooter({ text: `-2 Happiness >:(` });
		} else {
			const modifed = LumiUtils.modifyHappiness(lumi, 1, 'increment');
			if (modifed) youWon.setFooter({ text: `+1 Happiness c: (good sport)` });
		}

		await interaction.editReply({ embeds: [youWon] });
	}
}
