import { User, type UserDocument, type UserHydratedDocument } from "../models/User.js";
import { NotFoundError } from "../utils/errors.js";
import type { AddressInput, UpdateProfileInput } from "../validators/user.validators.js";

async function getUserOrThrow(userId: string): Promise<UserHydratedDocument> {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("Usuario no encontrado");
  }
  return user;
}

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<UserDocument> {
  const user = await getUserOrThrow(userId);
  Object.assign(user, input);
  await user.save();
  return user;
}

function unsetOtherDefaults(user: UserHydratedDocument, keepId?: string): void {
  for (const address of user.addresses) {
    if (address._id.toString() !== keepId) {
      address.isDefault = false;
    }
  }
}

export async function addAddress(userId: string, input: AddressInput): Promise<UserDocument> {
  const user = await getUserOrThrow(userId);
  user.addresses.push(input);
  const added = user.addresses[user.addresses.length - 1]!;
  if (input.isDefault) {
    unsetOtherDefaults(user, added._id.toString());
  }
  await user.save();
  return user;
}

export async function updateAddress(
  userId: string,
  addressId: string,
  input: AddressInput,
): Promise<UserDocument> {
  const user = await getUserOrThrow(userId);
  const address = user.addresses.id(addressId);
  if (!address) {
    throw new NotFoundError("Dirección no encontrada");
  }
  address.set(input);
  if (input.isDefault) {
    unsetOtherDefaults(user, addressId);
  }
  await user.save();
  return user;
}

export async function removeAddress(userId: string, addressId: string): Promise<UserDocument> {
  const user = await getUserOrThrow(userId);
  const address = user.addresses.id(addressId);
  if (!address) {
    throw new NotFoundError("Dirección no encontrada");
  }
  address.deleteOne();
  await user.save();
  return user;
}
