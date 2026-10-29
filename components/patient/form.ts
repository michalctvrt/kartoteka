/** Formulář karty pacienta – sdílený typ mezi stránkou a dlaždicemi. */

export interface PatientForm {
  firstName: string;
  middleName: string;
  lastName: string;
  title: string;
  birthDate: string;
  gender: "MALE" | "FEMALE" | "";
  idInsuranceCompany: string;
  phone: string;
  email: string;
  weight: string;
  height: string;
}

export const EMPTY_FORM: PatientForm = {
  firstName: "",
  middleName: "",
  lastName: "",
  title: "",
  birthDate: "",
  gender: "",
  idInsuranceCompany: "",
  phone: "",
  email: "",
  weight: "",
  height: "",
};

export type FormProps = {
  value: PatientForm;
  editing: boolean;
  onChange: (patch: Partial<PatientForm>) => void;
};

export const GENDER_LABEL: Record<string, string> = { MALE: "Muž", FEMALE: "Žena" };
