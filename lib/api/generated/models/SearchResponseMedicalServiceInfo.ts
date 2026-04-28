/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MedicalServiceInfo } from './MedicalServiceInfo';
/**
 * Results of search
 */
export type SearchResponseMedicalServiceInfo = {
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
    data?: Array<MedicalServiceInfo>;
};

