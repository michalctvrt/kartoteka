/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Request for patient's data insert
 */
export type StorePatientDataRequest = {
    /**
     * ID of patient's insurance company
     */
    idInsuranceCompany?: string | null;
    /**
     * Patient's date of birth
     */
    birthDate?: string;
    /**
     * Patient's gender
     */
    gender?: StorePatientDataRequest.gender;
    /**
     * Patient's first name
     */
    firstName?: string;
    /**
     * Patient's middle name
     */
    middleName?: string | null;
    /**
     * Patient's last name
     */
    lastName?: string;
    /**
     * Patient's title
     */
    title?: string | null;
    /**
     * Patient's email
     */
    email?: string | null;
    /**
     * Patient's title
     */
    phone?: string | null;
    /**
     * Patient's weight in kg
     */
    weight?: number | null;
    /**
     * Patient's height in cm
     */
    height?: number | null;
};
export namespace StorePatientDataRequest {
    /**
     * Patient's gender
     */
    export enum gender {
        MALE = 'MALE',
        FEMALE = 'FEMALE',
    }
}

