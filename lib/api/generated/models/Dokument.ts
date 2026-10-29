/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { KRPacientDto } from './KRPacientDto';
import type { KRPoskytovatelDto } from './KRPoskytovatelDto';
import type { KRZdravotnickyPracovnikDto } from './KRZdravotnickyPracovnikDto';
import type { PolozkaCiselnikuDto } from './PolozkaCiselnikuDto';
import type { Slozka } from './Slozka';
import type { Soubor } from './Soubor';
export type Dokument = {
    id?: string;
    verzeRadku?: string;
    nazev?: string;
    popis?: string;
    jazyk?: PolozkaCiselnikuDto;
    typ?: PolozkaCiselnikuDto;
    klasifikace?: PolozkaCiselnikuDto;
    kod?: string;
    autor?: string;
    autorData?: KRZdravotnickyPracovnikDto;
    poskytovatel?: string;
    poskytovatelData?: KRPoskytovatelDto;
    pacient?: string;
    pacientData?: KRPacientDto;
    dostupnost?: boolean;
    duvernost?: PolozkaCiselnikuDto;
    format?: PolozkaCiselnikuDto;
    mime?: PolozkaCiselnikuDto;
    hash?: string;
    velikost?: number;
    vazanyDokument?: string;
    soubor?: Soubor;
    slozka?: Slozka;
};

