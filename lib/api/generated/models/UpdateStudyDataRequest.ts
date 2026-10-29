/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { StudySaveBasicInfo } from './StudySaveBasicInfo';
/**
 * Study data to update
 */
export type UpdateStudyDataRequest = {
    /**
     * If set, current study dateEdit will be checked for concurrent update
     */
    lastTsEdit?: string;
    studySaveBasicInfo: StudySaveBasicInfo;
};

