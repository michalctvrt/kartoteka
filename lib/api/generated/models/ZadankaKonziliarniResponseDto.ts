/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodeableConcept } from './CodeableConcept';
import type { DiagnozaDto } from './DiagnozaDto';
import type { PolozkaCiselnikuDto } from './PolozkaCiselnikuDto';
import type { PrilohaInfoDto } from './PrilohaInfoDto';
export type ZadankaKonziliarniResponseDto = {
    kodNahrady?: PolozkaCiselnikuDto;
    uhrada?: CodeableConcept;
    prilohy?: Array<PrilohaInfoDto>;
    typVysetreni?: PolozkaCiselnikuDto;
    doporuceni?: PolozkaCiselnikuDto;
    pozadovanaVysetreni?: Array<CodeableConcept>;
    doporuceniDetail?: string;
    duvodZadanky?: DiagnozaDto;
    zavaznaAnamnestickaData?: string;
    vysledkyVysetreni?: string;
    soucasnaLecba?: string;
    diferencialneDiagnostickaRozvaha?: string;
};

