/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MedicalDiagnosisInfo } from '../models/MedicalDiagnosisInfo';
import type { MedicalServiceCategoryInfo } from '../models/MedicalServiceCategoryInfo';
import type { MedicalServiceInfo } from '../models/MedicalServiceInfo';
import type { MedicalSkillInfo } from '../models/MedicalSkillInfo';
import type { SearchRequestMedicalDiagnosisSearchFilterMedicalDiagnosisBrowseFilter } from '../models/SearchRequestMedicalDiagnosisSearchFilterMedicalDiagnosisBrowseFilter';
import type { SearchRequestMedicalServiceSearchFilterMedicalServiceBrowseFilter } from '../models/SearchRequestMedicalServiceSearchFilterMedicalServiceBrowseFilter';
import type { SearchResponseMedicalDiagnosisInfo } from '../models/SearchResponseMedicalDiagnosisInfo';
import type { SearchResponseMedicalServiceInfo } from '../models/SearchResponseMedicalServiceInfo';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class MedicalDefinitionsService {
    /**
     * Find Medical Diagnosis by ID
     * @param id
     * @returns MedicalDiagnosisInfo default response
     * @throws ApiError
     */
    public static findById1(
        id: string,
    ): CancelablePromise<MedicalDiagnosisInfo> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/medical-diagnosis/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Search medical diagnosis
     * @param requestBody
     * @returns SearchResponseMedicalDiagnosisInfo default response
     * @throws ApiError
     */
    public static search(
        requestBody?: SearchRequestMedicalDiagnosisSearchFilterMedicalDiagnosisBrowseFilter,
    ): CancelablePromise<SearchResponseMedicalDiagnosisInfo> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/medical-diagnosis/:search',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Find Medical Service Category by ID
     * @param id
     * @returns MedicalServiceCategoryInfo default response
     * @throws ApiError
     */
    public static findById3(
        id: string,
    ): CancelablePromise<MedicalServiceCategoryInfo> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/medical-service-category/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Lists all Medical Service Categories
     * @returns MedicalServiceCategoryInfo default response
     * @throws ApiError
     */
    public static list1(): CancelablePromise<Array<MedicalServiceCategoryInfo>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/medical-service-category/:listLocal',
        });
    }
    /**
     * Find Medical Service by ID
     * @param id
     * @returns MedicalServiceInfo default response
     * @throws ApiError
     */
    public static findById4(
        id: string,
    ): CancelablePromise<MedicalServiceInfo> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/medical-service/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Search medical services
     * @param requestBody
     * @returns SearchResponseMedicalServiceInfo default response
     * @throws ApiError
     */
    public static search2(
        requestBody?: SearchRequestMedicalServiceSearchFilterMedicalServiceBrowseFilter,
    ): CancelablePromise<SearchResponseMedicalServiceInfo> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/medical-service/:search',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Lists all medical skills
     * @returns MedicalSkillInfo default response
     * @throws ApiError
     */
    public static list2(): CancelablePromise<Array<MedicalSkillInfo>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/medical-skill',
        });
    }
}
