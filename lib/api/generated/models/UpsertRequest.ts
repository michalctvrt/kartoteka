/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UpsertRequest = {
    /**
     * Medical institution short description
     */
    description: string;
    /**
     * Medical institution long description
     */
    descriptionLong: string;
    /**
     * Medical institution long description
     */
    doctorName: string;
    /**
     * Medical institution long description
     */
    doctorEmail?: string;
    /**
     * Medical skill
     */
    idMedicalSkill: string;
    /**
     * Until when is record valid
     */
    dateValidTill?: string;
    /**
     * ICZ
     */
    icz?: string;
    /**
     * ID in CGM system
     */
    cgmId?: string;
    /**
     * Which XML exports should be fired for this medical institution
     */
    idXmlExportDefinition: Array<string>;
};

