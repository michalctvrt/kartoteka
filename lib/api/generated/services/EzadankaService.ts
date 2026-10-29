/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { NactiZadankuDto } from '../models/NactiZadankuDto';
import type { VyhledejZadankuDto } from '../models/VyhledejZadankuDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class EzadankaService {
    /**
     * Find eZadanka by ID
     * @param id
     * @returns NactiZadankuDto default response
     * @throws ApiError
     */
    public static findById(
        id: string,
    ): CancelablePromise<NactiZadankuDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/ezadanka/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Find eZadanka by Patient ID
     * @param pid
     * @param code
     * @param onlyActive
     * @returns VyhledejZadankuDto default response
     * @throws ApiError
     */
    public static findByParams(
        pid?: string,
        code?: string,
        onlyActive?: boolean,
    ): CancelablePromise<Array<VyhledejZadankuDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/ezadanka',
            query: {
                'pid': pid,
                'code': code,
                'onlyActive': onlyActive,
            },
        });
    }
}
