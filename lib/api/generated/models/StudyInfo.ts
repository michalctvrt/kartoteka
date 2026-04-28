/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { InsuranceCompanyInfo } from './InsuranceCompanyInfo';
import type { MedicalDiagnosisInfo } from './MedicalDiagnosisInfo';
import type { MedicalInstitutionInfo } from './MedicalInstitutionInfo';
import type { PatientDataInfo } from './PatientDataInfo';
import type { StudyAttachmentInfo } from './StudyAttachmentInfo';
import type { StudyRemoteAccessInfo } from './StudyRemoteAccessInfo';
import type { StudyServiceInfo } from './StudyServiceInfo';
/**
 * Returned records
 */
export type StudyInfo = {
    id: number;
    uid: string;
    dicomUid: string;
    pid: string;
    patientDataInfo: PatientDataInfo;
    idMedicalInstitutionRequested: string;
    medicalInstitutionRequestedInfo: MedicalInstitutionInfo;
    idMedicalDiagnosisRequested: string;
    medicalDiagnosisRequestedInfo: MedicalDiagnosisInfo;
    requestDate: string;
    flagSelfPay?: boolean;
    idInsuranceCompany: string;
    insuranceCompanyInfo: InsuranceCompanyInfo;
    idCatInsuranceType: number;
    idMedicalServiceCategory: string;
    rtgKap: number;
    rtgSeries: number;
    studyDate: string;
    dateEmailed: string;
    studyServiceInfo?: Array<StudyServiceInfo>;
    remark: string;
    description: string;
    dateDescriptionChanged: string;
    nameDescriptionChanged: string;
    usernameDescriptionChanged: string;
    correctionNumber: number;
    idWorkingplaceCreated: string;
    whoCr: string;
    dateCr: string;
    whoEdit: string;
    dateEdit: string;
    flagUrgent?: boolean;
    flagDeleted?: boolean;
    flagCompleted?: boolean;
    flagRemoteAccessAfterCompleted?: boolean;
    studyAttachmentInfo?: Array<StudyAttachmentInfo>;
    studyRemoteAccessInfo?: StudyRemoteAccessInfo;
};

