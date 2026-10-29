/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BiometrickeUdaje } from './BiometrickeUdaje';
import type { CodeableConcept } from './CodeableConcept';
import type { DalsiRelevantniUdaje } from './DalsiRelevantniUdaje';
import type { ImplantatModel } from './ImplantatModel';
import type { InformaceOObjednavceModel } from './InformaceOObjednavceModel';
import type { Kontraindikace } from './Kontraindikace';
import type { PolozkaCiselnikuDto } from './PolozkaCiselnikuDto';
import type { PozadovaneVysetreniZDto } from './PozadovaneVysetreniZDto';
import type { PrilohaInfoDto } from './PrilohaInfoDto';
import type { UrgentniInformaceModel } from './UrgentniInformaceModel';
export type ZadankaResponseDto = {
    kodNahrady?: PolozkaCiselnikuDto;
    uhrada?: CodeableConcept;
    prilohy?: Array<PrilohaInfoDto>;
    biometrickeUdaje?: BiometrickeUdaje;
    informaceOObjednavce?: InformaceOObjednavceModel;
    pozadovanaVysetreni?: Array<PozadovaneVysetreniZDto>;
    urgentniInformace?: UrgentniInformaceModel;
    kontraindikace?: Kontraindikace;
    dalsiRelevantniUdaje?: DalsiRelevantniUdaje;
    implantat?: Array<ImplantatModel>;
    omezeniMobility?: CodeableConcept;
};

