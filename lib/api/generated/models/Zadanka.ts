/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DodatecnyPrijemce } from './DodatecnyPrijemce';
import type { PolozkaCiselnikuDto } from './PolozkaCiselnikuDto';
import type { Vzorek } from './Vzorek';
import type { Zasilka } from './Zasilka';
export type Zadanka = {
    id?: string;
    verzeRadku?: string;
    stav?: PolozkaCiselnikuDto;
    kod?: string;
    urgentnost?: PolozkaCiselnikuDto;
    samoplatce?: boolean;
    prilozenVzorek?: boolean;
    omezeniMobility?: boolean;
    popisOmezeniMobility?: string;
    instrukceProPacienta?: string;
    zpusobVyrizeni?: PolozkaCiselnikuDto;
    zpusobVyrizeniUpresneni?: string;
    nadrizenaZadankaId?: string;
    zasilkaVysledekId?: string;
    datumStorna?: string;
    datumZaznaceniNeproveditelnosti?: string;
    datumPoslednihoVraceniDoObehu?: string;
    datumPoslednihoPrijeti?: string;
    datumRozdeleni?: string;
    datumVyrizeni?: string;
    datumExpirace?: string;
    datumPlanovanehoVysetreni?: string;
    datumSkutecneRealizaceVysetreni?: string;
    pacientPojistovna?: PolozkaCiselnikuDto;
    icpZadatele?: string;
    pacientImplantat?: boolean;
    vzorekData?: Array<Vzorek>;
    zasilka?: Zasilka;
    dodatecnyPrijemce?: Array<DodatecnyPrijemce>;
    metodaData?: Array<PolozkaCiselnikuDto>;
    obsahujePrilohy?: boolean;
};

