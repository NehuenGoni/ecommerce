import { User, type UserRole } from "../models/User.js";
import { signAccessToken } from "../utils/jwt.js";

let counter = 0;

export async function createUserWithToken(role: UserRole = "customer") {
  counter += 1;
  const user = await User.create({
    email: `test-user-${counter}@example.com`,
    password: "supersecret",
    firstName: "Test",
    lastName: "User",
    role,
  });
  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
  return { user, accessToken };
}

export function createAdminWithToken() {
  return createUserWithToken("admin");
}
