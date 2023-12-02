import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	CommandInteraction,
	ModalBuilder,
	ModalSubmitInteraction,
	TextInputBuilder,
	TextInputStyle,
	bold,
	inlineCode
} from 'discord.js';
import { ButtonComponent, Discord, ModalComponent, Slash } from 'discordx';
import NodeCache from 'node-cache';
import { prisma } from '..';
import * as Embeds from '../constants/Embeds';

const cache = new NodeCache({ stdTTL: 60 });

@Discord()
class Adopt {
	@Slash({ description: 'Adopt a Lumi' })
	async adopt(interaction: CommandInteraction) {
		await interaction.deferReply({
			ephemeral: true
		});

		const player = await prisma.player.findUnique({
			where: {
				id: interaction.user.id
			}
		});

		if (player !== null && player.lumi !== null) {
			const lumi = await prisma.lumi.findUnique({
				where: {
					id: player.lumi
				}
			});

			const embed = Embeds.error()
				.setTitle('You already have a Lumi!')
				.setDescription(`In order to adopt a new one, you'll have to disown ${bold(lumi.name)} :(`);

			interaction.editReply({
				embeds: [embed]
			});
			return;
		}

		cache.set(interaction.user.id, true);

		const onboarding = Embeds.info()
			.setTitle('Starting your journey')
			.setDescription(
				'Adopting a Lumi can be difficult, do you agree to be direct messaged by your Lumi?'
			);

		const start = new ButtonBuilder()
			.setCustomId('create')
			.setStyle(ButtonStyle.Success)
			.setLabel('Start');
		const end = new ButtonBuilder()
			.setCustomId('backout')
			.setStyle(ButtonStyle.Danger)
			.setLabel('Back out');
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(start, end);

		await interaction.editReply({
			embeds: [onboarding],
			components: [row]
		});
	}

	@ButtonComponent({ id: 'create' })
	async handleCreate(interaction: ButtonInteraction): Promise<void> {
		if (!cache.has(interaction.user.id)) {
			await interaction.deferUpdate();
			return;
		}

		const modal = new ModalBuilder().setTitle('Creating your Lumi').setCustomId('create-lumi');
		const form = new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder().setLabel('Name').setCustomId('name').setStyle(TextInputStyle.Short)
		);

		modal.addComponents(form);
		interaction.showModal(modal);
	}

	@ButtonComponent({ id: 'backout' })
	async handleEnd(interaction: ButtonInteraction): Promise<void> {
		await interaction.deferUpdate();
		if (!cache.has(interaction.user.id)) return;

		const embed = Embeds.info()
			.setTitle('Adoption process cancelled.')
			.setDescription('Okie dokie, feel free to come back at any time!');
		await interaction.followUp({
			embeds: [embed],
			ephemeral: true
		});

		cache.del(interaction.user.id);
	}

	@ModalComponent({ id: 'create-lumi' })
	async handleForm(interaction: ModalSubmitInteraction): Promise<void> {
		const lumiName = interaction.fields.getTextInputValue('name');

		await interaction.deferReply({
			ephemeral: true
		});

		const theirLumi = await prisma.lumi.create({
			data: {
				name: lumiName,
				playerId: interaction.user.id
			}
		});

		await prisma.lumiStats.create({
			data: {
				lumiId: theirLumi.id
			}
		});

		let currentIndex = 0;
		const intervalId = setInterval(async () => displayMsg(), 2500);

		const displayMsg = async () => {
			const name = bold(theirLumi.name);
			const messages = [
				`Signing adoption papers for ${name}...`,
				`Telling ${name} their name...`,
				`${name} is ready to take home! Start by doing ${inlineCode('/lumi feed')}.`
			];

			if (currentIndex >= messages.length) {
				clearInterval(intervalId);
				return;
			}

			await interaction.editReply({
				content: messages[currentIndex]
			});

			currentIndex++;
		};
		displayMsg();

		await prisma.player.upsert({
			where: {
				id: interaction.user.id
			},
			create: {
				id: interaction.user.id,
				lumi: theirLumi.id
			},
			update: {
				lumi: theirLumi.id
			}
		});
	}
}
