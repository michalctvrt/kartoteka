/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { InsuranceCompanyInfo } from '../models/InsuranceCompanyInfo';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class InsuranceCompanyService {
    /**
     * Find Insurance Company by ID
     * @param id
     * @returns InsuranceCompanyInfo default response
     * @throws ApiError
     */
    public static findById(
        id: string,
    ): CancelablePromise<InsuranceCompanyInfo> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/insurance-company/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Lists all Insurance companies
     * @returns InsuranceCompanyInfo default response
     * @throws ApiError
     */
    public static list(): CancelablePromise<Array<InsuranceCompanyInfo>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/insurance-company',
        });
    }
}
