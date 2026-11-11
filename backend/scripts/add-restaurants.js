// Adds the extra restaurants and their menus to an existing database.
// DELETES NOTHING and skips any restaurant whose name already exists, so it is safe to run again.
//   node scripts/add-restaurants.js
const mongoose = require('mongoose');
const config = require('../config');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const { MORE_RESTAURANTS } = require('../data/moreRestaurants');

const addMoreRestaurants = async ({ ownerId } = {}) => {
  let added = 0;
  let dishes = 0;
  for (const { restaurant, menu } of MORE_RESTAURANTS) {
    if (await Restaurant.exists({ name: restaurant.name })) continue;
    const r = await Restaurant.create({ ...restaurant, ...(ownerId && { ownerId }) });
    await MenuItem.insertMany(menu.map((m) => ({ ...m, restaurantId: r._id })));
    added += 1;
    dishes += menu.length;
  }
  return { added, dishes, skipped: MORE_RESTAURANTS.length - added };
};

if (require.main === module) {
  (async () => {
    await mongoose.connect(config.MONGODB_URI);
    console.log(`✅ Connected to database "${mongoose.connection.db.databaseName}"`);
    const { added, dishes, skipped } = await addMoreRestaurants();
    console.log(`🍽️  ${added} restaurants added with ${dishes} dishes (${skipped} already existed). Nothing was deleted.`);
    await mongoose.disconnect();
  })().catch(async (err) => {
    console.error('❌', err.message);
    await mongoose.disconnect();
    process.exit(1);
  });
}

module.exports = { addMoreRestaurants };
