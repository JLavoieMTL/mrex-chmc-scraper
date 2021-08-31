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

  async getReport() {
    const $ = cheerio.load(this.primaryRentalDetail);
    let headers: any = [];
    let headerIndex = -1;
    $(`.profileDetailItems thead tr th`).each((i: any, elem: any) => {
      const header = $(elem).text();
      if (header) {
        headers[headerIndex].push(header);
      } else {
        headerIndex += 1;
        headers[headerIndex] = [];
      }
    });

    const tableNameList = ['units', 'vacancy', 'rents', 'availability'];
    let tableList: any = {};
    $(`.profileDetailItems tbody`).each((tBodyIndex: any, tBodyElem: any) => {
      $(tBodyElem, 'tr').each((tRowIndex: any, tRowElem: any) => {
        const tableData: any = {};
        const tHead: any = [];

        $('th', tRowElem).each((tHeadIndex: any, tHeadElem: any) =>
          tHead.push($(tHeadElem).text()),
        );
        const tHeadLength = tHead.length;
        const tDataList = $('td', tRowElem);
        const tDataListLength = tDataList.length;

        tDataList.each((tDataIndex: any, tDataElem: any) => {
          const hasOnlyValue =
            tDataListLength === tHeadLength * 3 ? true : false;
          const hasValueAndAccuracy =
            tDataListLength === tHeadLength * 6 ? true : false;

          let tData = $(tDataElem).text();
          const header = headers[tBodyIndex];
          const headerLength = header.length;
          let topHeaderAttr = hasValueAndAccuracy
            ? header[Math.floor((tDataIndex % (headerLength * 2)) / 2)]
            : header[tDataIndex % headerLength];
          const LeftHeaderAttr = hasValueAndAccuracy
            ? tHead[Math.floor(tDataIndex / (headerLength * 2))]
            : tHead[Math.floor(tDataIndex / headerLength)];

          topHeaderAttr = `20${topHeaderAttr.split('-')[1]}`;

          if (!tableData.hasOwnProperty(topHeaderAttr)) {
            tableData[topHeaderAttr] = {};
          }

          if (hasOnlyValue) {
            tableData[topHeaderAttr][this.getBedRoom(LeftHeaderAttr)] = {
              value: isNaN(parseFloat(tData)) ? null : parseFloat(tData),
            };
          } else if (hasValueAndAccuracy) {
            if (tDataIndex % 2 === 0) {
              tableData[topHeaderAttr][this.getBedRoom(LeftHeaderAttr)] = {
                ...tableData[topHeaderAttr][this.getBedRoom(LeftHeaderAttr)],
                value: isNaN(parseFloat(tData)) ? null : parseFloat(tData),
              };
            } else {

              tableData[topHeaderAttr][this.getBedRoom(LeftHeaderAttr)] = {
                ...tableData[topHeaderAttr][this.getBedRoom(LeftHeaderAttr)],
                accuracy: ['a','b','c','d'].includes(tData.trim()) ? tData.trim() : null,
              };
            }
          }
        });

        tableList[tableNameList[tBodyIndex]] = tableData;
      });
    });

    return tableList;
  }

  async getDetailsPrimaryRentalResult(geographyId: string) {
    const res = await axios.post(
      'https://www03.cmhc-schl.gc.ca/hmip-pimh/en/Profile/DetailsPrimaryRentalMarket',
      {
        geographyId,
        t: 7,
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
