/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MedicalRequest } from './MedicalRequest';
import type { PatientDataSaveInfo } from './PatientDataSaveInfo';
/**
 * Study data to be stored
 */
export type StudySaveBasicInfo = {
    /**
     * PID - Patient's id
     */
    pid: string;
    patientData: PatientDataSaveInfo;
    /**
     * Study date, in case it is not set. Current time will be used
     */
    studyDate?: string;
    /**
     * Remark
     */
    remark?: string;
    /**
     * ID of Working place this study is created for
     */
    idWorkingplace: string;
    /**
     * If set to true, patient will have remote access to study after being completed
     */
    flagRemoteAccessAfterCompleted: boolean;
    /**
     * If set to true, study will be marked as urgent
     */
    flagUrgent: boolean;
    /**
     * ID of Medical Service Category of the study
     */
    idMedicalServiceCategory: string;
    /**
     * medical services and their amount
     */
    medicalServices: Record<string, number>;
    /**
     * If set to true, study will be paid by patient otherwise it will by paid by insurance company and insuranceRequest must be set
     */
    flagSelfPay: boolean;
    medicalRequest: MedicalRequest;
};

