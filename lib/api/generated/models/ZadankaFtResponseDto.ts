/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodeableConcept } from './CodeableConcept';
import type { DiagnozaDto } from './DiagnozaDto';
import type { PolozkaCiselnikuDto } from './PolozkaCiselnikuDto';
import type { PrilohaInfoDto } from './PrilohaInfoDto';
import type { VykonFtDto } from './VykonFtDto';
export type ZadankaFtResponseDto = {
    kodNahrady?: PolozkaCiselnikuDto;
    uhrada?: CodeableConcept;
    prilohy?: Array<PrilohaInfoDto>;
    stavPacienta?: string;
    cil?: string;
    datumPlanovaneKontroly?: string;
    castTela?: Array<CodeableConcept>;
    adresa?: string;
    duvodZadanky?: DiagnozaDto;
    pozadovanaVysetreni?: Array<VykonFtDto>;
    druhPece?: PolozkaCiselnikuDto;
    doplnujiciInformace?: string;
    vylouceniUpravyIndikace?: boolean;
};

