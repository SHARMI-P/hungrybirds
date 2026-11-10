// Reusable Zod building blocks.
const { z } = require('zod');
const mongoose = require('mongoose');

const objectId = z
  .string()
  .refine((v) => mongoose.isValidObjectId(v), { message: 'Invalid id' });

const idParams = z.object({ id: objectId });

const lat = z.coerce.number().min(-90).max(90);
const lng = z.coerce.number().min(-180).max(180);

const httpUrl = z.union([z.literal(''), z.url({ protocol: /^https?$/ })]);

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

module.exports = { z, objectId, idParams, lat, lng, httpUrl, pagination };
