/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type BrowseDateFilter = {
    values?: Array<string>;
    comparator: BrowseDateFilter.comparator;
};
export namespace BrowseDateFilter {
    export enum comparator {
        EQ = 'EQ',
        NE = 'NE',
        IS_NULL = 'IS_NULL',
        IS_NOT_NULL = 'IS_NOT_NULL',
        IN = 'IN',
        NOT_IN = 'NOT_IN',
        BETWEEN = 'BETWEEN',
        GT = 'GT',
        GE = 'GE',
        LT = 'LT',
        LE = 'LE',
        LIKE = 'LIKE',
        NOT_LIKE = 'NOT_LIKE',
        BIN_MASK = 'BIN_MASK',
        EQ_OR_IS_NULL = 'EQ_OR_IS_NULL',
    }
}

