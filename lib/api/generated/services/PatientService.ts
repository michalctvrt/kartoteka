/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PatientDataInfo } from '../models/PatientDataInfo';
import type { PatientInfo } from '../models/PatientInfo';
import type { SearchRequestPatientSearchFilterPatientBrowseFilter } from '../models/SearchRequestPatientSearchFilterPatientBrowseFilter';
import type { SearchResponsePatientInfo } from '../models/SearchResponsePatientInfo';
import type { StorePatientDataRequest } from '../models/StorePatientDataRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PatientService {
    /**
     * Find patient by PID
     * Returns PatientInfo
     * @param pid
     * @returns PatientInfo ..
     * @throws ApiError
     */
    public static findByPid(
        pid: string,
    ): CancelablePromise<PatientInfo> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/patient/{pid}',
            path: {
                'pid': pid,
            },
        });
    }
    /**
     * Stores new patient data.
     * If patient by PID already exists, their current data is updatated. Otherwise patient with passed PID and data is created
     * @param pid
     * @param requestBody
     * @returns PatientDataInfo default response
     * @throws ApiError
     */
    public static storeNewPatientData(
        pid: string,
        requestBody?: StorePatientDataRequest,
    ): CancelablePromise<PatientDataInfo> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/patient/{pid}',
            path: {
                'pid': pid,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Searches for patients based on params
     * Returns List of PatientInfo
     * @param requestBody
     * @returns SearchResponsePatientInfo default response
     * @throws ApiError
     */
    public static search3(
        requestBody?: SearchRequestPatientSearchFilterPatientBrowseFilter,
    ): CancelablePromise<SearchResponsePatientInfo> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/patient/:search',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
