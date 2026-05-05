import { openFoodDb, searchFoods } from "../search/food-db.js";

const db = openFoodDb();

console.log("\n─── search_packaged_food('indomie mi goreng') ───");
const r1 = searchFoods(db, "indomie mi goreng", {
  limit: 3,
  source: "openfoodfacts",
});
for (const r of r1) {
  const { id, score, ...rest } = r;
  console.log(rest);
}

console.log("\n─── search_packaged_food('pocari', country='Indonesia') ───");
const r2 = searchFoods(db, "pocari", {
  limit: 3,
  source: "openfoodfacts",
  country: "Indonesia",
});
for (const r of r2) {
  const { id, score, ...rest } = r;
  console.log(rest);
}

console.log("\n─── search_usda('chicken breast') ───");
const r3 = searchFoods(db, "chicken breast", { limit: 3, source: "usda" });
for (const r of r3) {
  const { id, score, ...rest } = r;
  console.log(rest);
}

db.close();
