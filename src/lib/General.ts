import { User } from 'discord.js';
import { client } from '..';

const Dayjs = require('dayjs');
var utc = require('dayjs/plugin/utc');
var timezone = require('dayjs/plugin/timezone'); // dependent on utc plugin
Dayjs.extend(utc);
Dayjs.extend(timezone);
Dayjs.tz.setDefault('America/New_York');

const getTime = () => Dayjs().tz('America/New_York').format('MM/DD [@] hh:mm A');

const prettify = (s: string, titleCase: boolean = false) => {
	let newString = s.replace(/(_|-)/gi, ' ');
	newString = newString.charAt(0).toUpperCase() + newString.slice(1);
	if (!titleCase) return newString;
	else
		return newString
			.split(' ')
			.map((word) => word[0].toUpperCase() + word.substring(1))
			.join(' ');
};

const getCommand = async (name: string) => {
	await client.application.commands.fetch();
	return client.application.commands.cache.find((c) => c.name == name);
};

const removeOne = (arr: string[], item: string) => {
	const index = arr.indexOf(item);
	if (index !== -1) arr.splice(index, 1);
	return arr;
};

const getRandomResponse = (arr: string[], user: User) => {
	const randomResponse = arr[Math.floor(Math.random() * arr.length)];
	return randomResponse.replace('{username}', user.username);
};

export { prettify, getTime, getCommand, removeOne, getRandomResponse };
