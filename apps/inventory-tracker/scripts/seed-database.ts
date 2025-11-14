#!/usr/bin/env node

/**
 * School Uniform Inventory Tracker - Database Seeding Script
 *
 * This script generates realistic mock data for a school uniform inventory system
 * using @faker-js/faker. It creates categories, products, variants, and activities
 * that reflect real-world school uniform business scenarios.
 *
 * Usage:
 *   pnpm run seed
 *   pnpm run seed:reset  # Clear and reseed database
 */

import { faker } from "@faker-js/faker";
import { Pool } from "pg";

// Database configuration
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@postgres_main:5432/inventory?sslmode=disable";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// School uniform specific data
const SCHOOL_UNIFORM_DATA = {
  categories: [
    {
      name: "Baju Seragam SD",
      description: "Seragam sekolah dasar untuk siswa tingkat 1-6",
      products: [
        {
          name: "Kemeja Putih SD",
          description: "Kemeja putih seragam sekolah dasar dengan logo sekolah",
          variants: [
            { name: "Size S", size: "S", color: "Putih" },
            { name: "Size M", size: "M", color: "Putih" },
            { name: "Size L", size: "L", color: "Putih" },
            { name: "Size XL", size: "XL", color: "Putih" },
            { name: "Size XXL", size: "XXL", color: "Putih" },
          ],
        },
        {
          name: "Kemeja Biru SD",
          description: "Kemeja biru seragam sekolah dasar untuk hari tertentu",
          variants: [
            { name: "Size S", size: "S", color: "Biru" },
            { name: "Size M", size: "M", color: "Biru" },
            { name: "Size L", size: "L", color: "Biru" },
            { name: "Size XL", size: "XL", color: "Biru" },
            { name: "Size XXL", size: "XXL", color: "Biru" },
          ],
        },
      ],
    },
    {
      name: "Baju Seragam SMP",
      description: "Seragam sekolah menengah pertama untuk siswa tingkat 7-9",
      products: [
        {
          name: "Kemeja Putih SMP",
          description: "Kemeja putih seragam sekolah menengah pertama",
          variants: [
            { name: "Size S", size: "S", color: "Putih" },
            { name: "Size M", size: "M", color: "Putih" },
            { name: "Size L", size: "L", color: "Putih" },
            { name: "Size XL", size: "XL", color: "Putih" },
            { name: "Size XXL", size: "XXL", color: "Putih" },
          ],
        },
        {
          name: "Kemeja Biru SMP",
          description: "Kemeja biru seragam sekolah menengah pertama",
          variants: [
            { name: "Size S", size: "S", color: "Biru" },
            { name: "Size M", size: "M", color: "Biru" },
            { name: "Size L", size: "L", color: "Biru" },
            { name: "Size XL", size: "XL", color: "Biru" },
            { name: "Size XXL", size: "XXL", color: "Biru" },
          ],
        },
      ],
    },
    {
      name: "Baju Seragam SMA",
      description: "Seragam sekolah menengah atas untuk siswa tingkat 10-12",
      products: [
        {
          name: "Kemeja Putih SMA",
          description: "Kemeja putih seragam sekolah menengah atas",
          variants: [
            { name: "Size S", size: "S", color: "Putih" },
            { name: "Size M", size: "M", color: "Putih" },
            { name: "Size L", size: "L", color: "Putih" },
            { name: "Size XL", size: "XL", color: "Putih" },
            { name: "Size XXL", size: "XXL", color: "Putih" },
          ],
        },
        {
          name: "Kemeja Biru Navy SMA",
          description: "Kemeja biru navy seragam sekolah menengah atas",
          variants: [
            { name: "Size S", size: "S", color: "Biru Navy" },
            { name: "Size M", size: "M", color: "Biru Navy" },
            { name: "Size L", size: "L", color: "Biru Navy" },
            { name: "Size XL", size: "XL", color: "Biru Navy" },
            { name: "Size XXL", size: "XXL", color: "Biru Navy" },
          ],
        },
      ],
    },
    {
      name: "Celana & Rok Seragam",
      description: "Celana dan rok seragam untuk semua tingkat sekolah",
      products: [
        {
          name: "Celana Panjang SD",
          description: "Celana panjang seragam sekolah dasar warna navy",
          variants: [
            { name: "Size S", size: "S", color: "Navy" },
            { name: "Size M", size: "M", color: "Navy" },
            { name: "Size L", size: "L", color: "Navy" },
            { name: "Size XL", size: "XL", color: "Navy" },
            { name: "Size XXL", size: "XXL", color: "Navy" },
          ],
        },
        {
          name: "Rok SD",
          description: "Rok seragam sekolah dasar warna navy",
          variants: [
            { name: "Size S", size: "S", color: "Navy" },
            { name: "Size M", size: "M", color: "Navy" },
            { name: "Size L", size: "L", color: "Navy" },
            { name: "Size XL", size: "XL", color: "Navy" },
            { name: "Size XXL", size: "XXL", color: "Navy" },
          ],
        },
        {
          name: "Celana Panjang SMP",
          description: "Celana panjang seragam sekolah menengah pertama",
          variants: [
            { name: "Size S", size: "S", color: "Navy" },
            { name: "Size M", size: "M", color: "Navy" },
            { name: "Size L", size: "L", color: "Navy" },
            { name: "Size XL", size: "XL", color: "Navy" },
            { name: "Size XXL", size: "XXL", color: "Navy" },
          ],
        },
        {
          name: "Rok SMP",
          description: "Rok seragam sekolah menengah pertama",
          variants: [
            { name: "Size S", size: "S", color: "Navy" },
            { name: "Size M", size: "M", color: "Navy" },
            { name: "Size L", size: "L", color: "Navy" },
            { name: "Size XL", size: "XL", color: "Navy" },
            { name: "Size XXL", size: "XXL", color: "Navy" },
          ],
        },
      ],
    },
    {
      name: "Topi Seragam",
      description: "Topi seragam untuk semua tingkat sekolah",
      products: [
        {
          name: "Topi SD",
          description: "Topi seragam sekolah dasar dengan logo",
          variants: [
            { name: "Size S", size: "S", color: "Putih" },
            { name: "Size M", size: "M", color: "Putih" },
            { name: "Size L", size: "L", color: "Putih" },
          ],
        },
        {
          name: "Topi SMP",
          description: "Topi seragam sekolah menengah pertama",
          variants: [
            { name: "Size S", size: "S", color: "Biru" },
            { name: "Size M", size: "M", color: "Biru" },
            { name: "Size L", size: "L", color: "Biru" },
          ],
        },
        {
          name: "Topi SMA",
          description: "Topi seragam sekolah menengah atas",
          variants: [
            { name: "Size S", size: "S", color: "Biru Navy" },
            { name: "Size M", size: "M", color: "Biru Navy" },
            { name: "Size L", size: "L", color: "Biru Navy" },
          ],
        },
      ],
    },
    {
      name: "Aksesoris Seragam",
      description: "Aksesoris pelengkap seragam sekolah",
      products: [
        {
          name: "Dasi SD",
          description: "Dasi seragam sekolah dasar",
          variants: [
            { name: "Size S", size: "S", color: "Merah" },
            { name: "Size M", size: "M", color: "Merah" },
            { name: "Size L", size: "L", color: "Merah" },
          ],
        },
        {
          name: "Dasi SMP",
          description: "Dasi seragam sekolah menengah pertama",
          variants: [
            { name: "Size S", size: "S", color: "Biru" },
            { name: "Size M", size: "M", color: "Biru" },
            { name: "Size L", size: "L", color: "Biru" },
          ],
        },
        {
          name: "Name Tag",
          description: "Name tag seragam sekolah dengan nama siswa",
          variants: [{ name: "Standard", size: "Standard", color: "Putih" }],
        },
      ],
    },
  ],
};

// Price ranges for different product types (in Indonesian Rupiah)
const PRICE_RANGES = {
  "Baju Seragam SD": { cost: [25000, 45000], sell: [35000, 65000] },
  "Baju Seragam SMP": { cost: [30000, 55000], sell: [45000, 75000] },
  "Baju Seragam SMA": { cost: [35000, 65000], sell: [55000, 85000] },
  "Celana & Rok Seragam": { cost: [20000, 40000], sell: [30000, 55000] },
  "Topi Seragam": { cost: [15000, 25000], sell: [20000, 35000] },
  "Aksesoris Seragam": { cost: [5000, 15000], sell: [10000, 25000] },
};

// Stock ranges for different product types
const STOCK_RANGES = {
  "Baju Seragam SD": [20, 100],
  "Baju Seragam SMP": [15, 80],
  "Baju Seragam SMA": [10, 60],
  "Celana & Rok Seragam": [25, 120],
  "Topi Seragam": [30, 150],
  "Aksesoris Seragam": [50, 200],
};

// Utility functions
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function getRandomPrice(categoryName: string, type: "cost" | "sell"): number {
  const range = PRICE_RANGES[categoryName as keyof typeof PRICE_RANGES];
  if (!range) return getRandomInt(10000, 50000);

  const price = getRandomInt(range[type][0], range[type][1]);
  // Round to nearest 500
  return Math.round(price / 500) * 500;
}

function getRandomStock(categoryName: string): number {
  const range = STOCK_RANGES[categoryName as keyof typeof STOCK_RANGES];
  if (!range) return getRandomInt(10, 50);

  return getRandomInt(range[0], range[1]);
}

function getRandomDateInLastMonths(months: number = 6): Date {
  const now = new Date();
  const pastDate = new Date(now.getTime() - months * 30 * 24 * 60 * 60 * 1000);
  return faker.date.between({ from: pastDate, to: now });
}

// Database operations
async function clearDatabase(): Promise<void> {
  console.log("🗑️  Clearing existing data...");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Delete in reverse dependency order
    await client.query("DELETE FROM product_activities");
    await client.query("DELETE FROM transactions");
    await client.query("DELETE FROM product_variants");
    await client.query("DELETE FROM products");
    await client.query("DELETE FROM product_categories");

    await client.query("COMMIT");
    console.log("✅ Database cleared successfully");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error clearing database:", error);
    throw error;
  } finally {
    client.release();
  }
}

async function seedCategories(): Promise<Map<string, number>> {
  console.log("🌱 Seeding categories...");

  const categoryMap = new Map<string, number>();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const categoryData of SCHOOL_UNIFORM_DATA.categories) {
      const result = await client.query(
        "INSERT INTO product_categories (name, description) VALUES ($1, $2) RETURNING id",
        [categoryData.name, categoryData.description],
      );

      categoryMap.set(categoryData.name, result.rows[0].id);
      console.log(`✅ Created category: ${categoryData.name}`);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error seeding categories:", error);
    throw error;
  } finally {
    client.release();
  }

  return categoryMap;
}

async function seedProducts(
  categoryMap: Map<string, number>,
): Promise<Map<string, number>> {
  console.log("🌱 Seeding products...");

  const productMap = new Map<string, number>();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const categoryData of SCHOOL_UNIFORM_DATA.categories) {
      const categoryId = categoryMap.get(categoryData.name);
      if (!categoryId) continue;

      for (const productData of categoryData.products) {
        const result = await client.query(
          "INSERT INTO products (category_id, name, description) VALUES ($1, $2, $3) RETURNING id",
          [categoryId, productData.name, productData.description],
        );

        productMap.set(productData.name, result.rows[0].id);
        console.log(`✅ Created product: ${productData.name}`);
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error seeding products:", error);
    throw error;
  } finally {
    client.release();
  }

  return productMap;
}

async function seedVariants(
  productMap: Map<string, number>,
): Promise<Map<string, number>> {
  console.log("🌱 Seeding variants...");

  const variantMap = new Map<string, number>();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const categoryData of SCHOOL_UNIFORM_DATA.categories) {
      for (const productData of categoryData.products) {
        const productId = productMap.get(productData.name);
        if (!productId) continue;

        for (const variantData of productData.variants) {
          const costPrice = getRandomPrice(categoryData.name, "cost");
          const sellPrice = getRandomPrice(categoryData.name, "sell");
          const stock = getRandomStock(categoryData.name);

          const result = await client.query(
            "INSERT INTO product_variants (product_id, name, description, cost_price, sell_price, stock) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            [
              productId,
              variantData.name,
              `${variantData.color} - ${variantData.size}`,
              costPrice,
              sellPrice,
              stock,
            ],
          );

          const variantKey = `${productData.name} - ${variantData.name}`;
          variantMap.set(variantKey, result.rows[0].id);
          console.log(`✅ Created variant: ${variantKey} (Stock: ${stock})`);
        }
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error seeding variants:", error);
    throw error;
  } finally {
    client.release();
  }

  return variantMap;
}

async function seedTransactionsAndActivities(
  variantMap: Map<string, number>,
): Promise<void> {
  console.log("🌱 Seeding transactions and activities...");

  const activityTypes = ["Restock", "Sales", "Refund", "Adjustment"] as const;
  const transactionNotes = [
    "Penjualan reguler",
    "Restock produk",
    "Penjualan grosir",
    "Penjualan eceran",
    "Penyesuaian stok",
    "Return dari customer",
    "Penjualan online",
    "Penjualan offline",
  ];

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Generate 50-100 transactions over the last 6 months
    const numTransactions = getRandomInt(50, 100);

    for (let i = 0; i < numTransactions; i++) {
      const transactionDate = getRandomDateInLastMonths(6);
      const notes = faker.helpers.arrayElement(transactionNotes);

      // Create transaction
      const transactionResult = await client.query(
        "INSERT INTO transactions (notes, created_at) VALUES ($1, $2) RETURNING id",
        [notes, transactionDate.toISOString()],
      );

      const transactionId = transactionResult.rows[0].id;

      // Generate 1-5 activities per transaction
      const numActivities = getRandomInt(1, 5);
      const selectedVariants = faker.helpers.arrayElements(
        Array.from(variantMap.keys()),
        { min: 1, max: Math.min(numActivities, variantMap.size) },
      );

      for (const variantKey of selectedVariants) {
        const variantId = variantMap.get(variantKey);
        if (!variantId) continue;

        const [productName, variantName] = variantKey.split(" - ");
        const activityType = faker.helpers.arrayElement(activityTypes);
        const quantity = getRandomInt(1, 10);

        // Get variant details for pricing
        const variantResult = await client.query(
          "SELECT cost_price, sell_price, product_id FROM product_variants WHERE id = $1",
          [variantId],
        );

        if (variantResult.rows.length === 0) continue;
        const variant = variantResult.rows[0];

        // Get product details
        const productResult = await client.query(
          "SELECT name, category_id FROM products WHERE id = $1",
          [variant.product_id],
        );

        if (productResult.rows.length === 0) continue;
        const product = productResult.rows[0];

        // Get category details
        const categoryResult = await client.query(
          "SELECT name FROM product_categories WHERE id = $1",
          [product.category_id],
        );

        if (categoryResult.rows.length === 0) continue;
        const category = categoryResult.rows[0];

        let unitCost = variant.cost_price;
        let unitRevenue = variant.sell_price;

        // Add some price variation for sales (discounts/promotions)
        if (activityType === "Sales") {
          const discount = getRandomFloat(0.05, 0.15); // 5-15% discount
          unitRevenue = Math.round(unitRevenue * (1 - discount));
        }

        // Add some cost variation for adjustments
        if (activityType === "Adjustment") {
          const adjustment = getRandomFloat(-0.1, 0.1); // ±10% adjustment
          unitCost = Math.round(unitCost * (1 + adjustment));
        }

        await client.query(
          `INSERT INTO product_activities 
           (transaction_id, product_id, variant_id, category_id, product_name, variant_name, type, quantity, unit_cost, unit_revenue, notes, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            transactionId,
            variant.product_id,
            variantId,
            product.category_id,
            product.name,
            variantName,
            activityType,
            quantity,
            unitCost,
            unitRevenue,
            faker.lorem.sentence(),
            transactionDate.toISOString(),
          ],
        );
      }

      if ((i + 1) % 10 === 0) {
        console.log(`✅ Created ${i + 1}/${numTransactions} transactions`);
      }
    }

    await client.query("COMMIT");
    console.log(`✅ Created ${numTransactions} transactions with activities`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error seeding transactions and activities:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Main seeding function
async function seedDatabase(): Promise<void> {
  console.log(
    "🚀 Starting database seeding for School Uniform Inventory Tracker...\n",
  );

  try {
    // Test database connection
    await pool.query("SELECT 1");
    console.log("✅ Database connection successful\n");

    // Clear existing data
    await clearDatabase();

    // Seed data in dependency order
    const categoryMap = await seedCategories();
    console.log(`✅ Created ${categoryMap.size} categories\n`);

    const productMap = await seedProducts(categoryMap);
    console.log(`✅ Created ${productMap.size} products\n`);

    const variantMap = await seedVariants(productMap);
    console.log(`✅ Created ${variantMap.size} variants\n`);

    await seedTransactionsAndActivities(variantMap);
    console.log("\n🎉 Database seeding completed successfully!");

    // Print summary
    console.log("\n📊 Seeding Summary:");
    console.log(`   Categories: ${categoryMap.size}`);
    console.log(`   Products: ${productMap.size}`);
    console.log(`   Variants: ${variantMap.size}`);
    console.log(`   Transactions: 50-100 (with activities)`);
    console.log(
      "\n✨ Your school uniform inventory tracker is ready with realistic mock data!",
    );
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// CLI handling
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  if (command === "reset") {
    console.log("🔄 Resetting and reseeding database...\n");
    seedDatabase();
  } else {
    seedDatabase();
  }
}

export { seedDatabase };
