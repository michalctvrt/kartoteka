/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { KRDokladDTO } from './KRDokladDTO';
export type KRPacientDto = {
    rid?: string;
    jmeno?: string;
    prijmeni?: string;
    datumNarozeni?: string;
    ruianId?: string;
    adresaCela?: string;
    zdravotniPojistovnaKod?: string;
    zdravotniPojistovnaNazev?: string;
    kontaktniEmail?: string;
    preferovanyJazyk?: string;
    cisloPojistence?: string;
    doklady?: Array<KRDokladDTO>;
};

