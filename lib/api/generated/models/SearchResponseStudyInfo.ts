/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { StudyInfo } from './StudyInfo';
/**
 * Results of search
 */
export type SearchResponseStudyInfo = {
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
    data?: Array<StudyInfo>;
};

