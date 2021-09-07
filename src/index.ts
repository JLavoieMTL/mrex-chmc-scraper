import { CHMCParser } from './utils/chmc-gateway'

const parser = new CHMCParser()

const postCode = 'H1C 1R9'
const address = 'levis (v)' 

console.log(`Test post code: ${postCode}`)
parser.searchByPostalCode(postCode, 'censustract').then(async res => {
    console.log(JSON.stringify(await parser.getReport(), null, 4))
})

console.log(`Test address: ${address}`)
parser.searchByAddress(address).then(async res => {
    console.log(JSON.stringify(await parser.getReport(), null, 4))
})
