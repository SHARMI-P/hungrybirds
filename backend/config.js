// Centralised, validated configuration. The app refuses to boot with a
// missing or weak secret instead of failing later in a confusing way.
require('dotenv').config({ quiet: true });
const { z } = require('zod');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  // Comma separated list of allowed browser origins, e.g.
  // https://hungrybirds-gamma.vercel.app,https://hbadmin.vercel.app
  CLIENT_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  GST_PERCENT: z.coerce.number().default(5),
  MAX_DELIVERY_KM: z.coerce.number().default(15),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  for (const issue of parsed.error.issues) console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

const env = parsed.data;

module.exports = {
  ...env,
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  clientOrigins: env.CLIENT_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
  razorpayEnabled: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET),
  cloudinaryEnabled: Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET),
};
