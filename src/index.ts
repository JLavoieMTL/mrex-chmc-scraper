import { CHMCParser } from './utils/chmc-gateway';

const parser = new CHMCParser();

parser.searchByPostalCode("H1C 1R9").then(async res => {
  console.log(JSON.stringify(await parser.getReport(), null, 4))
});

//parser.searchByAddress('levi').then(async res => {
//  const { units, vacancy, rents, availability } = await parser.getReport();
//});
