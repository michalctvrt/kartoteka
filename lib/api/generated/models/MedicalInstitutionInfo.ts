/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MedicalSkillInfo } from './MedicalSkillInfo';
export type MedicalInstitutionInfo = {
    id: string;
    description: string;
    descriptionLong: string;
    doctorName: string;
    doctorEmail: string;
    idMedicalSkill: string;
    dateValidTill: string;
    icz: string;
    cgmId: string;
    medicalSkillInfo: MedicalSkillInfo;
    idXmlExportDefinition?: Array<string>;
};

