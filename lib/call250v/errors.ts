export class Call250VError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "Call250VError";
  }
}

/** Česká hláška podle chybových kódů ze specifikace Call250V. */
export function describeStatus(status: number): string {
  switch (status) {
    case 400:
      return "Neplatný požadavek (chybný parametr).";
    case 401:
      return "Neznámé ID operátora v Call250V.";
    case 403:
      return "Do této činnosti nelze přidávat pacienty.";
    case 404:
      // Pozor: v tomto API 404 NEZNAMENÁ „nenalezeno“
      return "Server Call250V není dostupný.";
    case 409:
      return "Konflikt: pult je obsazený, nebo lístek je už ve frontě.";
    default:
      return `Chyba Call250V (${status}).`;
  }
}
