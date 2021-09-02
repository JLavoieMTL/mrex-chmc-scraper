import axios from 'axios';
const cheerio = require('cherio');

import { Address } from './address';

export class CHMCParser {
  addressResult: Address[] = [];
  primaryRentalDetail: any;

  async searchByAddress(address: string) {
    const res = await axios.post(
      'https://www03.cmhc-schl.gc.ca/hmip-pimh/en/Main/Search',
      {
        q: address,
        l: 50,
      },
    );
    this.addressResult = res.data;

    const geographyId = this.addressResult.map(address => address.OID).join('');
    this.primaryRentalDetail = await this.getDetailsPrimaryRentalResult(
      geographyId,
    );

    return this.primaryRentalDetail;
  }

  async searchByPostalCode(postalCode: string) {
    const res = await axios.post(
      'https://www03.cmhc-schl.gc.ca/hmip-pimh/en/Main/Search',
      {
        q: postalCode,
        l: 50,
      },
    );
    const postalResult = res.data;

    if (postalResult.length == 0 || postalResult[0]['Type'] != 'PostalCode')
      return null
    
    const geography = postalResult[0]['RelatedResults']
    const metropolitan = geography.find((g:any) => g.Subtype == 'MetropolitanMajorArea')
    const neighbourhood = geography.find((g:any) => g.Subtype == 'Neighbourhood')
    const census = geography.find((g:any) => g.Subtype == 'CensusTract')
    
    if (metropolitan == undefined || neighbourhood == undefined || census == undefined)
      return null

    const geographyId = metropolitan.OID + neighbourhood.OID + census.OID


    this.primaryRentalDetail = await this.getDetailsPrimaryRentalResult(
      geographyId,
    );

    return this.primaryRentalDetail;

  }

  async getReport() {
	  //const result = {units: {}, vacancy: {}, rents: {}, availability: {}} 
	  const result:any = {units: {}, vacancy: {}, rents: {}, availability: {}} 

    const $ = cheerio.load(this.primaryRentalDetail);

    const tableIndex:any = {0: "units", 1: "vacancy", 2: "rents", 3: "availability"}
    $(".profileDetailTable").each((i: any, tBodyElem: any) => {
      const tableName = tableIndex[i]
      const data = $('td', tBodyElem)
      let dataIndex = 0

      // Process Row Headers (Bachelor, 1 Bedroom, 2 Bedroom, etc...)
      $('th[scope="row"]', tBodyElem).each((headerIndex: any, headerElem: any) => {
        const header = $(headerElem).text()

        if (header) {

          // Process Dates
          $('thead th', tBodyElem).each((dateIndex: any, dateElem: any) =>{
            const date = $(dateElem).text()

            if (date) {
              const colspan = dateElem.attribs.colspan
              const year = parseInt('20' + date.split('-')[1])

              if (result[tableName][year] == undefined)
                result[tableName][year] = {}
              
              const value = $(data[dataIndex++]).text()

              if (colspan == 2) {
                const accuracy = $(data[dataIndex++]).text()
                result[tableName][year][header] = {value, accuracy}
              } else {
                result[tableName][year][header] = {value}
              }
            }

          });
        }
      });
    });

    return result;
  }

  async getDetailsPrimaryRentalResult(geographyId: string) {
    const res = await axios.post(
      'https://www03.cmhc-schl.gc.ca/hmip-pimh/en/Profile/DetailsPrimaryRentalMarket',
      {
        fixCacheBug: 1
      },
      {
        params: {
          geographyId,
          t: 7,
        }
      },
    );

    return res.data;
  }

  getBedRoom(name: string) {
    switch (name) {
      case '1 Bedroom':
        return '1BR';
      case '2 Bedroom':
        return '2BR';
      case '3 Bedroom +':
        return '3BR';
      default:
        return name.toLowerCase();
    }
  }
}
