import { CHMCParser } from './utils/chmc-gateway';

const parser = new CHMCParser();

parser.searchByAddress('levi').then(async res => {
  const { units, vacancy, rents, availability } = await parser.getReport();
});
