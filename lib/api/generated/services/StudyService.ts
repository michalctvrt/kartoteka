/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DocumentDataInfo } from '../models/DocumentDataInfo';
import type { SearchRequestStudySearchFilterStudyBrowseFilter } from '../models/SearchRequestStudySearchFilterStudyBrowseFilter';
import type { SearchResponseStudyInfo } from '../models/SearchResponseStudyInfo';
import type { StudyInfo } from '../models/StudyInfo';
import type { StudyRemoteAccessInfo } from '../models/StudyRemoteAccessInfo';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class StudyService {
    /**
     * Cancels patient's remote access to study
     * @param id
     * @returns any default response
     * @throws ApiError
     */
    public static cancelRemoteAccess(
        id: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/study/{id}/:cancelRemoteAccess',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Creates remote access to study
     * @param id
     * @returns StudyRemoteAccessInfo default response
     * @throws ApiError
     */
    public static createRemoteAccess(
        id: number,
    ): CancelablePromise<StudyRemoteAccessInfo> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/study/{id}/:createRemoteAccess',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Creates worklist record from study
     * @param requestBody
     * @returns any default response
     * @throws ApiError
     */
    public static createWorklist(
        requestBody?: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/study/{id}/:createWorklist',
            body: requestBody,
            mediaType: '*/*',
        });
    }
    /**
     * Sends study PDF in email
     * @param id
     * @returns any default response
     * @throws ApiError
     */
    public static emailStudy(
        id: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/study/{id}/:emailStudy',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Exports study to master CardFile
     * @param id
     * @returns any default response
     * @throws ApiError
     */
    public static exportToMasterCardFile(
        id: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/study/{id}/:exportToMasterCardFile',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Find study by PID
     * Returns StudyInfo
     * @param id
     * @returns StudyInfo Finds study by id
     * @throws ApiError
     */
    public static findById5(
        id: number,
    ): CancelablePromise<StudyInfo> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/study/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Get Study document data
     * @param id
     * @returns DocumentDataInfo default response
     * @throws ApiError
     */
    public static getDocumentData(
        id: number,
    ): CancelablePromise<DocumentDataInfo> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/study/{id}/documentData',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Get Study document data PDF
     * @param id
     * @returns any default response
     * @throws ApiError
     */
    public static getDocumentDataPdf(
        id: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/study/{id}/documentData.pdf',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Searches for studies based on params
     * Returns List of StudyInfo
     * @param requestBody
     * @returns SearchResponseStudyInfo default response
     * @throws ApiError
     */
    public static search4(
        requestBody?: SearchRequestStudySearchFilterStudyBrowseFilter,
    ): CancelablePromise<SearchResponseStudyInfo> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/study/:search',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
