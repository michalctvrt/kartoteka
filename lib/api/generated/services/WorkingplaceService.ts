/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { WorkingplaceInfo } from '../models/WorkingplaceInfo';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class WorkingplaceService {
    /**
     * Find Workingplace by ID
     * @param id
     * @returns WorkingplaceInfo default response
     * @throws ApiError
     */
    public static findById6(
        id: string,
    ): CancelablePromise<WorkingplaceInfo> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/workingplace/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Lists all Workingplaces
     * @returns WorkingplaceInfo default response
     * @throws ApiError
     */
    public static list3(): CancelablePromise<Array<WorkingplaceInfo>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/workingplace',
        });
    }
}
