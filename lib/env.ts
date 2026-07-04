// Environment variable validation

interface EnvConfig {
  JWT_SECRET: string;
  NODE_ENV: string;
}

function validateEnv(): EnvConfig {
  const required = ["JWT_SECRET"];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("\n❌ Missing required environment variables:");
    missing.forEach(key => console.error(`   - ${key}`));
    console.error("\n📝 Setup Instructions:");
    console.error("   1. Copy .env.example to .env.local");
    console.error("   2. Run: node scripts/generate-jwt-secret.js");
    console.error("   3. Configure Firebase");
    console.error("   4. Create admin user in Firestore employees collection\n");
    
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
      "Please check your .env.local file and follow the setup instructions."
    );
  }

  // Validate JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET!;
  if (jwtSecret.length < 32) {
    console.warn("⚠️  WARNING: JWT_SECRET should be at least 32 characters long!");
    console.warn("   Run: node scripts/generate-jwt-secret.js");
  }

  return {
    JWT_SECRET: jwtSecret,
    NODE_ENV: process.env.NODE_ENV || "development",
  };
}

export const env = validateEnv();
