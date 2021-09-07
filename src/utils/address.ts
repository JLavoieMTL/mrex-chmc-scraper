export interface Address {
    Name?: string
    NormalizedName?: string
    OID?: string
    RelatedResults?: any[]
    Subtype: string
    Type?: string
    CensusSubdivision?: string
    NameEnglish?: string
    NameFrench?: string
    MetCode?: string
    MetName?: string
}

export interface Properties {
    units: any[]
    vacancy: any[]
    rents: any[]
    availability: any[]
}
