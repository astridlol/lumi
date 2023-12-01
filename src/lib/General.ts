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

export { prettify, getTime };
