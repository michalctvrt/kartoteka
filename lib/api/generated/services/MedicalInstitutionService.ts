/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MedicalInstitutionInfo } from '../models/MedicalInstitutionInfo';
import type { SearchRequestMedicalInstitutionSearchFilterMedicalInstitutionBrowseFilter } from '../models/SearchRequestMedicalInstitutionSearchFilterMedicalInstitutionBrowseFilter';
import type { SearchResponseMedicalInstitutionInfo } from '../models/SearchResponseMedicalInstitutionInfo';
import type { UpsertRequest } from '../models/UpsertRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class MedicalInstitutionService {
    /**
     * Find Medical Institution by ID
     * @param id
     * @returns MedicalInstitutionInfo default response
     * @throws ApiError
     */
    public static findById2(
        id: string,
    ): CancelablePromise<MedicalInstitutionInfo> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/medical-institution/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Search Medical Institutions by filters
     * @param id
     * @param requestBody
     * @returns MedicalInstitutionInfo default response
     * @throws ApiError
     */
    public static upsert(
        id: string,
        requestBody?: UpsertRequest,
    ): CancelablePromise<MedicalInstitutionInfo> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/medical-institution/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Search Medical Institution
     * @param requestBody
     * @returns SearchResponseMedicalInstitutionInfo default response
     * @throws ApiError
     */
    public static search1(
        requestBody?: SearchRequestMedicalInstitutionSearchFilterMedicalInstitutionBrowseFilter,
    ): CancelablePromise<SearchResponseMedicalInstitutionInfo> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/medical-institution/:search',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
