export type ID = string;

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  label: string;
  street: string;
  city: string;
  province: string;
  zipCode: string;
  isDefault: boolean;
}
