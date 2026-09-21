import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "rosas-cafe" },
    update: {},
    create: {
      name: "Rosa's Café",
      slug: "rosas-cafe",
      currency: "USD",
      taxRateBps: 825,
      primaryColor: "#7c2d12",
      address: "123 Main St, Springfield",
      phone: "555-0100",
      users: {
        create: {
          email: "owner@rosascafe.test",
          name: "Rosa Martinez",
          passwordHash,
          role: "OWNER",
        },
      },
    },
  });

  const starters = await prisma.category.create({
    data: { restaurantId: restaurant.id, name: "Starters", sortOrder: 0 },
  });
  const mains = await prisma.category.create({
    data: { restaurantId: restaurant.id, name: "Mains", sortOrder: 1 },
  });
  const drinks = await prisma.category.create({
    data: { restaurantId: restaurant.id, name: "Drinks", sortOrder: 2 },
  });

  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: starters.id,
      name: "Tortilla Soup",
      description: "Rich tomato broth, avocado, crispy tortilla strips.",
      priceCents: 695,
      sortOrder: 0,
    },
  });

  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: mains.id,
      name: "Carne Asada Tacos",
      description: "Three tacos, grilled steak, onion, cilantro.",
      priceCents: 1395,
      sortOrder: 0,
      optionGroups: {
        create: [
          {
            name: "Tortilla",
            required: true,
            multiSelect: false,
            sortOrder: 0,
            choices: {
              create: [
                { name: "Corn", priceDeltaCents: 0, sortOrder: 0 },
                { name: "Flour", priceDeltaCents: 0, sortOrder: 1 },
              ],
            },
          },
          {
            name: "Add-ons",
            required: false,
            multiSelect: true,
            sortOrder: 1,
            choices: {
              create: [
                { name: "Extra cheese", priceDeltaCents: 100, sortOrder: 0 },
                { name: "Guacamole", priceDeltaCents: 200, sortOrder: 1 },
              ],
            },
          },
        ],
      },
    },
  });

  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: drinks.id,
      name: "Horchata",
      description: "House-made, served over ice.",
      priceCents: 450,
      sortOrder: 0,
      optionGroups: {
        create: [
          {
            name: "Size",
            required: true,
            multiSelect: false,
            sortOrder: 0,
            choices: {
              create: [
                { name: "Regular", priceDeltaCents: 0, sortOrder: 0 },
                { name: "Large", priceDeltaCents: 150, sortOrder: 1 },
              ],
            },
          },
        ],
      },
    },
  });

  await prisma.table.createMany({
    data: [
      { restaurantId: restaurant.id, label: "Table 1" },
      { restaurantId: restaurant.id, label: "Table 2" },
      { restaurantId: restaurant.id, label: "Patio 1" },
    ],
  });

  console.log("Seeded restaurant:", restaurant.slug);
  console.log("Login with owner@rosascafe.test / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
