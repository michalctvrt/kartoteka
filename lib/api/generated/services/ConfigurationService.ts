/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { XmlExportDefinitionInfo } from '../models/XmlExportDefinitionInfo';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ConfigurationService {
    /**
     * List all XML export definitions
     * @returns XmlExportDefinitionInfo default response
     * @throws ApiError
     */
    public static listXmlExportDefinitions(): CancelablePromise<Array<XmlExportDefinitionInfo>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/configuration/xmlExportDefinitions',
        });
    }
}
