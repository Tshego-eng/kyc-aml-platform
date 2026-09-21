import bcrypt from "bcryptjs";
import prisma from "./src/lib/prisma";

/**
 * Standalone seed script — NOT imported or run automatically by
 * src/index.ts, so starting the production server never seeds anyone.
 * Run intentionally with: npx tsx seed.ts
 *
 * Requires SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in the environment.
 * There is deliberately no hardcoded default: a production operator
 * must supply their own credentials, and the script refuses to run
 * without them rather than falling back to a guessable default.
 */
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in the environment before running this script. Nothing has been created."
    );
  }

  if (password.length < 8) {
    throw new Error(
      "SEED_ADMIN_PASSWORD must be at least 8 characters (matches the platform's own password policy)."
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: {
      email,
    },
    update: {},
    create: {
      name: "System Administrator",
      email,
      passwordHash,
      role: "ADMIN",
    },
  });

  // Never log the password — only non-sensitive confirmation fields.
  console.log("Admin user ready:");
  console.log({
    id: admin.id,
    email: admin.email,
    role: admin.role,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
