/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AdresatData } from './AdresatData';
import type { Dokument } from './Dokument';
import type { KRPacientDto } from './KRPacientDto';
import type { KRPoskytovatelDto } from './KRPoskytovatelDto';
import type { KRZdravotnickyPracovnikDto } from './KRZdravotnickyPracovnikDto';
import type { PolozkaCiselnikuDto } from './PolozkaCiselnikuDto';
export type Zasilka = {
    id?: string;
    verzeRadku?: string;
    nazev?: string;
    popis?: string;
    stav?: PolozkaCiselnikuDto;
    typ?: PolozkaCiselnikuDto;
    klasifikace?: PolozkaCiselnikuDto;
    odbornost?: PolozkaCiselnikuDto;
    datumOd?: string;
    datumDo?: string;
    datumVytvoreni?: string;
    autor?: string;
    autorData?: KRZdravotnickyPracovnikDto;
    zdravotnickyPracovnik?: string;
    zdravotnickyPracovnikData?: KRZdravotnickyPracovnikDto;
    poskytovatel?: string;
    poskytovatelData?: KRPoskytovatelDto;
    pacient?: string;
    pacientData?: KRPacientDto;
    ispzs?: string;
    adresat?: string;
    adresatData?: AdresatData;
    adresatTyp?: PolozkaCiselnikuDto;
    dostupnost?: boolean;
    rodic?: string;
    udalost?: PolozkaCiselnikuDto;
    dokument?: Array<Dokument>;
};

