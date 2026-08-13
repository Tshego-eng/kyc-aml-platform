import bcrypt from "bcryptjs";
import prisma from "./src/lib/prisma";

async function main() {
  const passwordHash = await bcrypt.hash(
    "AdminPassword123!",
    12
  );

  const admin = await prisma.user.upsert({
    where: {
      email: "admin@kycaml.local",
    },
    update: {},
    create: {
      name: "System Administrator",
      email: "admin@kycaml.local",
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("Admin user created:");
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