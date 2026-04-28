/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MedicalInstitutionInfo } from './MedicalInstitutionInfo';
export type WorkingplaceInfo = {
    id: string;
    idMedicalInstitution: string;
    medicalInstitutionInfo: MedicalInstitutionInfo;
    medicalFacilityId: string;
    shortId: string;
    reportTag: string;
    regionalOffice: string;
    flagChildMedicalServicesEnabled?: boolean;
};

