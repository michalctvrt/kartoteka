/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BrowseBooleanFilter } from './BrowseBooleanFilter';
import type { BrowseDateFilter } from './BrowseDateFilter';
import type { BrowseLongFilter } from './BrowseLongFilter';
import type { BrowseStringFilter } from './BrowseStringFilter';
export type StudyBrowseFilter = {
    id: BrowseLongFilter;
    pid: BrowseStringFilter;
    dateCr: BrowseDateFilter;
    studyDate: BrowseDateFilter;
    requestDate: BrowseDateFilter;
    flagUrgent: BrowseBooleanFilter;
    flagCompleted: BrowseBooleanFilter;
    idMedicalServiceCategory: BrowseStringFilter;
    idMedicalInstitutionRequested: BrowseStringFilter;
    usernameDescriptionChanged: BrowseStringFilter;
    idWorkingplaceCreated: BrowseStringFilter;
};

