/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BrowseDateFilter } from './BrowseDateFilter';
import type { BrowseStringFilter } from './BrowseStringFilter';
export type PatientBrowseFilter = {
    pid: BrowseStringFilter;
    birthDate: BrowseDateFilter;
    gender: BrowseStringFilter;
    firstName: BrowseStringFilter;
    middleName: BrowseStringFilter;
    lastName: BrowseStringFilter;
    email: BrowseStringFilter;
    phone: BrowseStringFilter;
};

