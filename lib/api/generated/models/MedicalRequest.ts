/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Medical information required for study that is paid by insurance company
 */
export type MedicalRequest = {
    /**
     * Date when study was requested
     */
    requestDate: string;
    /**
     * Who requested the study
     */
    idMedicalInstitutionRequested: string;
    /**
     * Medical diagnosis requested
     */
    idMedicalDiagnosisRequested: string;
    /**
     * Insurance company that is going to pay for the study
     */
    idInsuranceCompany: string;
    /**
     * Insurance type
     */
    idCatInsuranceType: number;
    /**
     * eZadanka ID
     */
    ezadankaId?: string;
};

