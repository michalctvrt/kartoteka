/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MedicalDiagnosisInfo } from './MedicalDiagnosisInfo';
/**
 * Results of search
 */
export type SearchResponseMedicalDiagnosisInfo = {
    /**
     * Total records that match the filters
     */
    totalCount?: number;
    /**
     * Number of records returned
     */
    count?: number;
    /**
     * Returned records
     */
    data?: Array<MedicalDiagnosisInfo>;
};

