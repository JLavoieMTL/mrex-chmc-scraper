import axios from 'axios'
import cheerio from 'cheerio'
import querystring from 'querystring'

import { Address } from './address'

export class CHMCParser {
    addressResult: Address[] = []
    primaryRentalDetail: any

    async searchByAddress(address: string) {
        const res = await axios.post(
            'https://www03.cmhc-schl.gc.ca/hmip-pimh/en/Main/Search',
            {
                q: address,
                l: 50,
            },
        )
        this.addressResult = res.data

        this.addressResult = this.addressResult.filter(
            el => el.Type == 'PlaceName',
        )

        if (this.addressResult.length == 0) return null

        const results: any = this.addressResult[0].RelatedResults
        const geographyId: any = results[results.length - 1].OID

        this.primaryRentalDetail = await this.getDetailsPrimaryRentalResult(
            geographyId,
            results[results.length - 1].Subtype == 'CensusTract' ? 7 : 6,
        )

        return this.primaryRentalDetail
    }

    async searchByPostalCode(postalCode: string, level:string = 'CensusTract') {
        const res = await axios.post(
            'https://www03.cmhc-schl.gc.ca/hmip-pimh/en/Main/Search',
            {
                q: postalCode,
                l: 50,
            },
        )
        const postalResult = res.data

        if (postalResult.length == 0 || postalResult[0]['Type'] != 'PostalCode')
            return null

        const relatedResults = postalResult[0]['RelatedResults']

        let postalRequest:any = {}

        for (let i =0; i < relatedResults.length; i++) {
            let geo = relatedResults[i]
            postalRequest[`results[${i}].Name`] = geo.Name ? geo.Name : ""
            postalRequest[`results[${i}].NormalizedName`] = geo.NormalizedName ? geo.NormalizedName : ""
            postalRequest[`results[${i}].Type`] = geo.Type
            postalRequest[`results[${i}].SubType`] = geo.Subtype
            postalRequest[`results[${i}].OID`] = geo.OID
        }

        const postalInfo = await axios.post("https://www03.cmhc-schl.gc.ca/hmip-pimh/en/Main/PostalCodeDetails",
            querystring.stringify(postalRequest), {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            })

        const $ = cheerio.load(postalInfo.data)

        const geographyCodes:any = {
            censustract: $('a[data-type="CensusTract"]'),
            neighbourhood: $('a[data-type="Neighbourhood"]'),
            surveyzone: $('a[data-type="SurveyZone"]'),
            metropolitanmajorarea: $('a[data-type="MetropolitanMajorArea"]'),
            province: $('a[data-type="Province"]')

        }

        const geographyId = geographyCodes[level].attr('data-id')


	this.primaryRentalDetail = await this.getDetailsPrimaryRentalResult(
	    geographyId,
	    geographyCodes[level].attr('data-type-code'),
	)

	if (this.primaryRentalDetail != null) {
		console.log(`Successfully retrived data for PostalCode: ${postalCode}, GeoId: ${geographyId}`)
	} else {
		console.log(`Failed to fetch data for PostalCode: ${postalCode}, GeoId: ${geographyId}`)
	}

        return this.primaryRentalDetail
    }

    async getReport() {
        if (this.primaryRentalDetail == null) return

        const result: any = {
            units: {},
            vacancy: {},
            rents: {},
            availability: {},
        }

        const $ = cheerio.load(this.primaryRentalDetail)

        const tableIndex: any = {
            0: 'units',
            1: 'vacancy',
            2: 'rents',
            3: 'availability',
        }

        $('.profileDetailTable').each((i: any, tBodyElem: any) => {
            const tableName = tableIndex[i]
            const data = $('td', tBodyElem)
            let dataIndex = 0

            // Process Row Headers (Bachelor, 1 Bedroom, 2 Bedroom, etc...)
            $('th[scope="row"]', tBodyElem).each(
                (headerIndex: any, headerElem: any) => {
                    const header = this.getBedRoom($(headerElem).text())

                    if (header) {
                        // Process Dates
                        $('thead th', tBodyElem).each(
                            (dateIndex: any, dateElem: any) => {
                                const date = $(dateElem).text()

                                if (date) {
                                    const colspan = dateElem.attribs.colspan
                                    const year = parseInt(
                                        '20' + date.split('-')[1],
                                    )

                                    if (result[tableName][year] == undefined)
                                        result[tableName][year] = {}

                                    const value = $(data[dataIndex++]).text()

                                    if (colspan == 2) {
                                        const accuracy = $(
                                            data[dataIndex++],
                                        ).text()
                                        result[tableName][year][header] = {
                                            value,
                                            accuracy,
                                        }
                                    } else {
                                        result[tableName][year][header] = {
                                            value,
                                        }
                                    }
                                }
                            },
                        )
                    }
                },
            )
        })

        return result
    }

    async getDetailsPrimaryRentalResult(geographyId: string, level: number) {
        try {
            const res = await axios.post(
                'https://www03.cmhc-schl.gc.ca/hmip-pimh/en/Profile/DetailsPrimaryRentalMarket',
                {
                    fixCacheBug: 1,
                },
                {
                    params: {
                        geographyId,
                        t: level,
                    },
                },
            )

            return res.data
        } catch (e) {
            console.log(`Could not retrive Rental Market Information: ${e}`)
            return null
        }
    }

    getBedRoom(name: string) {
        switch (name) {
            case '1 Bedroom':
                return '1BR'
            case '2 Bedroom':
                return '2BR'
            case '3 Bedroom +':
                return '3BR'
            default:
                return name.toLowerCase()
        }
    }
}
