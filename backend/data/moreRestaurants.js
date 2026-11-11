// Extra restaurants + menus for Dharwad & Hubli.
// Used by seed.js (fresh install) and scripts/add-restaurants.js (adds to a live DB without deleting).
// Images reuse photos already uploaded to the project's Cloudinary account.
const CDN = 'https://res.cloudinary.com/dzx9gfdeo/image/upload';
const IMG = {
  masalaDosa: `${CDN}/v1773300139/masala-dosa-recipe-500x500_kza8wn.jpg`,
  plainDosa: `${CDN}/v1773300137/Dosa-Recipe-Step-By-Step-Instructions-scaled_cemgf0.jpg`,
  setDosa: `${CDN}/v1773300144/28KITCHEN1-jumbo_rz4qfz.jpg`,
  idli: `${CDN}/v1773298690/Soft-Idlis-made-from-idli-dosa-batter-2_pzgag2.jpg`,
  vada: `${CDN}/v1773302621/hq720_aqchcj.jpg`,
  pongal: `${CDN}/v1773302722/pongal-ven-pongal_f4djwk.webp`,
  meals: `${CDN}/v1773300382/a94a23_aa674298181e422db3f4da9c8bfac4cc_mv2_olsx1w.jpg`,
  southMeals: `${CDN}/v1773300376/9634876480_20d7ac8196_o_oigwex.jpg`,
  thali: `${CDN}/v1773300379/11128282834_dfba237cd1_o_wrz3eh.jpg`,
  poori: `${CDN}/v1773302736/8397316064_b13c0d47b9_o_hgxc87.jpg`,
  filterCoffee: `${CDN}/v1773302748/Filter_1500x_y4vw2q.jpg`,
  coffee: `${CDN}/v1773301707/Corkframes_Coffee_Guide_520x500_422ebe38-4cfa-42b5-a266-b9bfecabaf30_faipdi.jpg`,
  buttermilk: `${CDN}/v1773302595/Blog_1_ohkzgz.jpg`,
  mirchi: `${CDN}/v1773302774/mirchi-bajji-mirapakaya-bajji-recipe_suiqnk.jpg`,
  samosa: `${CDN}/v1773301677/samosa-recipe_mwa4hq.jpg`,
  sweets: `${CDN}/v1773298631/ASSORTEDSWEETS_2_1_bubvw8.png`,
  jamun: `${CDN}/v1773301665/soft-gulab-jamun-recipe-for-raksha-bandhan-from-dough-to-syrup-all-you-need-to-know_u5evtg.webp`,
  jalebi: `${CDN}/v1773301670/53099699_ceim4l.jpg`,
  chickenBiryani: `${CDN}/v1773300244/chicken-biriyani_jhndxx.jpg`,
  specialBiryani: `${CDN}/v1773300225/chettinadu-chicken-biriyani-1-3_arm8vz.jpg`,
  muttonBiryani: `${CDN}/v1773300241/how-to-make-kerala-style-pressure-cooker-chicken-biriyani_zpj0nn.jpg`,
  vegBiryani: `${CDN}/v1773300238/500-x-380-Biryani_yfoboe.png`,
  kebab: `${CDN}/v1773298837/Kabab-torsh-with-salad-Shirazi-charred-onion-yogurt-1-1024x683_e0kdjv.jpg`,
  tikka: `${CDN}/v1773300428/lamb-shish-kebab-20-500x500_zvgxfn.jpg`,
  curry: `${CDN}/v1773302413/lamb-shish-kebab-20_g55xnu.jpg`,
  paneerTikka: `${CDN}/v1773301768/Healthy-Paneer-Tikka-Masala-recipe_svewqo.jpg`,
  shahiPaneer: `${CDN}/v1773302904/52446409_iu2onb.jpg`,
  dal: `${CDN}/v1773300308/dal-makhani-recipe_cy9iqw.webp`,
  naan: `${CDN}/v1773300328/butter-naan_ptfp5g.jpg`,
  garlicNaan: `${CDN}/v1773300343/butter-naan_rrdd9l.jpg`,
  salan: `${CDN}/v1773302916/Mirchi-Ka-Salan_final3-1_rlpigd.jpg`,
  gobi: `${CDN}/v1773300401/maxresdefault_bz7vju.jpg`,
  manchurian: `${CDN}/v1773300395/Gobi-Manchurian-HOHV_ytvwla.jpg`,
  vegFriedRice: `${CDN}/v1773302380/Fried-Rice-Heart-Naptime-11_t1eoci.jpg`,
  friedRice: `${CDN}/v1773302376/k_2FPhoto_2FSeries_2F2020-04-snapshot-cooking-5-recipes-to-make-with-2-cups-of-rice_2Fthekitchn-pork-fried-rice-beauty_70361c_landscape_jc0smk.jpg`,
  pizza: `${CDN}/v1773300167/tomato-mozzarella-pizza-FT-RECIPE0725-e7244e979c504188a049623668c15b2e_rs3lua.jpg`,
  pizza2: `${CDN}/v1773300178/Easy-Hawaiian-Pizza_EXPS_TOHVP24_276179_MR_03_27_2_jhusrw.jpg`,
  burger: `${CDN}/v1773300194/MSG-Smash-Burger-FT-RECIPE0124-d9682401f3554ef683e24311abdf342b_wtrsgm.jpg`,
  vegBurger: `${CDN}/v1773300206/c8788b46-aadf-4bd5-9b38-3f2865e6c728_fcvg6m.jpg`,
  shake: `${CDN}/v1773302389/Brownie-Milkshake-Recipe-20-scaled_a3eoac.jpg`,
  watermelon: `${CDN}/v1773300274/watermelon-juice-1_yyw88n.jpg`,
  mango: `${CDN}/v1773300280/health-benefits-of-mango-juice-GettyImages-1147373774-f7ebf4e4c13f4f67a2420df3c4325a04_s1ghxx.jpg`,
  smoothie: `${CDN}/v1773300291/5-super-powered-fresh-juice-and-smoothie-recipes.jpg_ujm5vj.webp`,
  room: `${CDN}/v1773301162/hotel-providence-paris-restaurant-main_ybif3p.jpg`,
};

const at = (lat, lng) => ({ type: 'Point', coordinates: [lng, lat] });
const item = (name, price, category, image, extra = {}) => ({ name, price, category, image, isVeg: true, ...extra });
const nonVeg = { isVeg: false };

const MORE_RESTAURANTS = [
  {
    restaurant: {
      name: 'Jolada Rotti Oota Mane', image: IMG.thali, cuisine: ['North Karnataka', 'Meals'], address: 'Saptapur, Dharwad',
      location: at(15.4652, 75.0118), rating: 4.6, totalRatings: 410, deliveryTime: '30-40 mins', prepTimeMins: 18, deliveryFee: 20, minimumOrder: 100,
      pureVeg: true, offers: ['Free shenga chutney with every meal'],
    },
    menu: [
      item('Jolada Rotti Meals', 140, 'Meals', IMG.thali, { description: '2 jowar rotti, ennegai, kalu palya, shenga chutney, curd, rice', isBestseller: true }),
      item('Ennegai Palya', 90, 'Curries', IMG.salan, { description: 'Stuffed brinjal in a rich peanut-sesame masala' }),
      item('Kalu Palya', 70, 'Curries', IMG.dal, { description: 'Sprouted green gram curry, North Karnataka style' }),
      item('Shenga Chutney Pudi', 50, 'Sides', IMG.sweets, { description: 'Dry groundnut chutney powder (100 g)' }),
      item('Akki Rotti', 60, 'Breads', IMG.plainDosa, { description: 'Rice flour flatbread with onion and dill' }),
      item('Majjige (Buttermilk)', 25, 'Drinks', IMG.buttermilk),
      item('Godhi Payasa', 60, 'Sweets', IMG.jamun, { description: 'Broken wheat kheer with jaggery' }),
    ],
  },
  {
    restaurant: {
      name: 'Hubli Girmit Corner', image: IMG.mirchi, cuisine: ['Street Food', 'Snacks'], address: 'Durgadbail, Hubli',
      location: at(15.3502, 75.1381), rating: 4.4, totalRatings: 655, deliveryTime: '20-30 mins', prepTimeMins: 10, deliveryFee: 15, minimumOrder: 60,
      pureVeg: true, offers: ['Combo: Girmit + Mirchi ₹70'],
    },
    menu: [
      item('Girmit', 40, 'Chaats', IMG.mirchi, { description: 'Hubli-style puffed rice with onion-tomato masala and sev', isBestseller: true }),
      item('Mirchi Bajji (4 pcs)', 45, 'Fried', IMG.mirchi, { description: 'Stuffed chilli fritters with onion topping', isBestseller: true }),
      item('Pani Puri', 40, 'Chaats', IMG.samosa),
      item('Masala Puri', 50, 'Chaats', IMG.samosa, { description: 'Crushed puri in hot peas gravy' }),
      item('Vada Pav', 35, 'Fried', IMG.vegBurger),
      item('Onion Pakoda', 45, 'Fried', IMG.gobi),
      item('Masala Chai', 20, 'Drinks', IMG.coffee),
    ],
  },
  {
    restaurant: {
      name: 'Malnad Mane', image: IMG.southMeals, cuisine: ['Malnad', 'South Indian'], address: 'Vidyagiri, Dharwad',
      location: at(15.4421, 75.0012), rating: 4.5, totalRatings: 280, deliveryTime: '35-45 mins', prepTimeMins: 20, deliveryFee: 30, minimumOrder: 150,
      offers: ['20% off on Sundays above ₹400'],
    },
    menu: [
      item('Kori Gassi with Neer Dosa', 260, 'Mains', IMG.curry, { ...nonVeg, description: 'Coconut chicken curry with 4 neer dosas', isBestseller: true }),
      item('Pork Pepper Fry', 280, 'Mains', IMG.tikka, nonVeg),
      item('Neer Dosa (4 pcs)', 70, 'Breads', IMG.plainDosa),
      item('Akki Rotti with Chutney', 80, 'Breads', IMG.setDosa),
      item('Kadubu with Chutney', 90, 'Breakfast', IMG.idli, { description: 'Steamed rice dumplings, Malnad style' }),
      item('Mushroom Ghee Roast', 210, 'Mains', IMG.paneerTikka),
      item('Kashaya', 30, 'Drinks', IMG.filterCoffee, { description: 'Herbal spiced drink' }),
    ],
  },
  {
    restaurant: {
      name: 'Karavali Coast Kitchen', image: IMG.room, cuisine: ['Seafood', 'Mangalorean'], address: 'Gokul Road, Hubli',
      location: at(15.3621, 75.1052), rating: 4.4, totalRatings: 372, deliveryTime: '35-50 mins', prepTimeMins: 22, deliveryFee: 35, minimumOrder: 200,
      offers: ['Free sol kadhi above ₹500'],
    },
    menu: [
      item('Prawn Ghee Roast', 340, 'Seafood', IMG.curry, { ...nonVeg, isBestseller: true }),
      item('Fish Thali', 290, 'Meals', IMG.meals, { ...nonVeg, description: 'Fish fry, fish curry, rice, sol kadhi, pickle' }),
      item('Anjal Rava Fry', 320, 'Seafood', IMG.kebab, { ...nonVeg, description: 'Semolina-crusted kingfish' }),
      item('Chicken Sukka', 240, 'Mains', IMG.tikka, nonVeg),
      item('Neer Dosa (4 pcs)', 70, 'Breads', IMG.plainDosa),
      item('Kane Rava Fry', 300, 'Seafood', IMG.kebab, nonVeg),
      item('Sol Kadhi', 50, 'Drinks', IMG.smoothie),
    ],
  },
  {
    restaurant: {
      name: 'Udupi Upahar', image: IMG.setDosa, cuisine: ['South Indian', 'Breakfast'], address: 'Old Hubli, Hubli',
      location: at(15.3718, 75.1452), rating: 4.3, totalRatings: 520, deliveryTime: '20-30 mins', prepTimeMins: 12, deliveryFee: 15, minimumOrder: 70,
      pureVeg: true, offers: ['Filter coffee ₹10 off with any dosa'],
    },
    menu: [
      item('Benne Masala Dosa', 75, 'Dosa', IMG.masalaDosa, { description: 'Davangere-style butter dosa', isBestseller: true }),
      item('Idli Vada', 55, 'Breakfast', IMG.idli),
      item('Rava Dosa', 70, 'Dosa', IMG.plainDosa),
      item('Ven Pongal', 60, 'Breakfast', IMG.pongal),
      item('Poori Saagu', 65, 'Breakfast', IMG.poori),
      item('Kesari Bath', 40, 'Sweets', IMG.jalebi),
      item('Filter Coffee', 25, 'Drinks', IMG.filterCoffee, { isBestseller: true }),
    ],
  },
  {
    restaurant: {
      name: 'Tandoor Nights', image: IMG.kebab, cuisine: ['North Indian', 'Mughlai', 'Kebab'], address: 'Vidyanagar, Hubli',
      location: at(15.3662, 75.1248), rating: 4.5, totalRatings: 610, deliveryTime: '35-45 mins', prepTimeMins: 22, deliveryFee: 30, minimumOrder: 180,
      offers: ['Free garlic naan above ₹450'],
    },
    menu: [
      item('Butter Chicken', 280, 'Mains', IMG.curry, { ...nonVeg, isBestseller: true }),
      item('Tandoori Chicken (Half)', 240, 'Tandoor', IMG.tikka, nonVeg),
      item('Mutton Seekh Kebab', 290, 'Tandoor', IMG.kebab, nonVeg),
      item('Paneer Tikka', 220, 'Tandoor', IMG.paneerTikka, { isBestseller: true }),
      item('Kadai Paneer', 230, 'Mains', IMG.shahiPaneer),
      item('Dal Makhani', 190, 'Mains', IMG.dal),
      item('Butter Naan', 45, 'Breads', IMG.naan),
      item('Garlic Naan', 55, 'Breads', IMG.garlicNaan),
    ],
  },
  {
    restaurant: {
      name: 'Spice Route Chinese', image: IMG.friedRice, cuisine: ['Chinese', 'Indo-Chinese'], address: 'Lakamanahalli, Dharwad',
      location: at(15.4702, 75.0249), rating: 4.2, totalRatings: 330, deliveryTime: '25-35 mins', prepTimeMins: 15, deliveryFee: 25, minimumOrder: 150,
      offers: ['Free spring rolls above ₹400'],
    },
    menu: [
      item('Hakka Noodles', 140, 'Noodles', IMG.vegFriedRice),
      item('Schezwan Fried Rice', 150, 'Rice', IMG.vegFriedRice, { isBestseller: true }),
      item('Chicken Fried Rice', 180, 'Rice', IMG.friedRice, nonVeg),
      item('Gobi Manchurian Dry', 140, 'Starters', IMG.gobi),
      item('Chilli Chicken', 210, 'Starters', IMG.manchurian, { ...nonVeg, isBestseller: true }),
      item('Veg Momos (8 pcs)', 110, 'Momos', IMG.idli),
      item('Chicken Momos (8 pcs)', 140, 'Momos', IMG.idli, nonVeg),
    ],
  },
  {
    restaurant: {
      name: 'Cheesy Crust Pizzeria', image: IMG.pizza2, cuisine: ['Pizza', 'Italian', 'Fast Food'], address: 'Keshwapur, Hubli',
      location: at(15.3561, 75.1302), rating: 4.1, totalRatings: 240, deliveryTime: '30-40 mins', prepTimeMins: 18, deliveryFee: 30, minimumOrder: 199,
      offers: ['Buy 1 get 1 on medium pizzas (Tue)'],
    },
    menu: [
      item('Margherita Pizza', 199, 'Pizza', IMG.pizza),
      item('Farmhouse Pizza', 279, 'Pizza', IMG.pizza2, { isBestseller: true }),
      item('Paneer Tikka Pizza', 299, 'Pizza', IMG.pizza2),
      item('Chicken BBQ Pizza', 329, 'Pizza', IMG.pizza2, nonVeg),
      item('White Sauce Pasta', 199, 'Pasta', IMG.vegFriedRice),
      item('Cheese Garlic Bread', 129, 'Sides', IMG.garlicNaan),
      item('Cold Coffee', 99, 'Drinks', IMG.shake),
    ],
  },
  {
    restaurant: {
      name: 'Green Bowl Salads & Smoothies', image: IMG.smoothie, cuisine: ['Healthy', 'Juices', 'Salads'], address: 'Kalyan Nagar, Dharwad',
      location: at(15.4562, 75.0171), rating: 4.4, totalRatings: 190, deliveryTime: '20-30 mins', prepTimeMins: 10, deliveryFee: 20, minimumOrder: 120,
      pureVeg: true, offers: ['10% off for students'],
    },
    menu: [
      item('Sprouts Chaat Bowl', 110, 'Salads', IMG.dal, { isBestseller: true }),
      item('Paneer Quinoa Salad', 180, 'Salads', IMG.paneerTikka),
      item('Mango Smoothie', 120, 'Smoothies', IMG.mango),
      item('Watermelon Cooler', 90, 'Juices', IMG.watermelon),
      item('Mixed Fruit Juice', 100, 'Juices', IMG.smoothie),
      item('Peanut Butter Banana Shake', 140, 'Smoothies', IMG.shake),
    ],
  },
  {
    restaurant: {
      name: 'Chai Katte Cafe', image: IMG.coffee, cuisine: ['Cafe', 'Snacks', 'Burgers'], address: 'Karnatak University Road, Dharwad',
      location: at(15.4405, 74.9862), rating: 4.3, totalRatings: 450, deliveryTime: '15-25 mins', prepTimeMins: 8, deliveryFee: 15, minimumOrder: 60,
      offers: ['Chai + Samosa ₹35'],
    },
    menu: [
      item('Masala Chai', 20, 'Drinks', IMG.coffee, { isBestseller: true }),
      item('Filter Coffee', 25, 'Drinks', IMG.filterCoffee),
      item('Bun Maska', 35, 'Snacks', IMG.vegBurger),
      item('Samosa (2 pcs)', 30, 'Snacks', IMG.samosa),
      item('Veg Grilled Sandwich', 80, 'Snacks', IMG.vegBurger),
      item('Chicken Burger', 130, 'Burgers', IMG.burger, nonVeg),
      item('Cold Coffee', 80, 'Drinks', IMG.shake),
    ],
  },
];

module.exports = { MORE_RESTAURANTS };
