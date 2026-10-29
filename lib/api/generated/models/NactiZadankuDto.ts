/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Zadanka } from './Zadanka';
import type { ZadankaFtResponseDto } from './ZadankaFtResponseDto';
import type { ZadankaKonziliarniResponseDto } from './ZadankaKonziliarniResponseDto';
import type { ZadankaResponseDto } from './ZadankaResponseDto';
import type { Zasilka } from './Zasilka';
export type NactiZadankuDto = {
    zadanka?: Zadanka;
    zadankaZ?: ZadankaResponseDto;
    zadankaFt?: ZadankaFtResponseDto;
    zadankaK?: ZadankaKonziliarniResponseDto;
    vysledkyZadanky?: Array<Zasilka>;
    podrizeneZadanky?: Array<Zadanka>;
};

