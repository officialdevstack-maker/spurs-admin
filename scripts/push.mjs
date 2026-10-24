import pkg from "@next/env"; pkg.loadEnvConfig(process.cwd());
import postgres from "postgres";
const sql = postgres(process.env.ADMIN_DATABASE_URL, { ssl:"require", max:1, prepare:false });
try {
  await sql`CREATE SCHEMA IF NOT EXISTS "admin"`;
  await sql`CREATE TABLE IF NOT EXISTS "admin"."admins" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "email" text NOT NULL UNIQUE, "name" text, "password_hash" text NOT NULL,
    "role" text DEFAULT 'staff' NOT NULL, "active" boolean DEFAULT true NOT NULL,
    "last_login_at" timestamptz, "created_at" timestamptz DEFAULT now() NOT NULL)`;
  await sql`CREATE TABLE IF NOT EXISTS "admin"."apps" (
    "id" text PRIMARY KEY NOT NULL, "name" text NOT NULL, "base_url" text,
    "description" text, "created_at" timestamptz DEFAULT now() NOT NULL)`;
  await sql`CREATE TABLE IF NOT EXISTS "admin"."credentials" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "app_id" text DEFAULT 'global' NOT NULL, "key" text NOT NULL,
    "value_encrypted" text NOT NULL, "scope" text DEFAULT 'all' NOT NULL,
    "secret" boolean DEFAULT true NOT NULL, "description" text,
    "updated_by" text, "updated_at" timestamptz DEFAULT now() NOT NULL)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS "credentials_app_key_scope_idx" ON "admin"."credentials" ("app_id","key","scope")`;
  await sql`CREATE TABLE IF NOT EXISTS "admin"."subscriptions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "app_id" text NOT NULL, "user_id" text NOT NULL,
    "plan" text DEFAULT 'free' NOT NULL, "active" boolean DEFAULT false NOT NULL,
    "renews_at" timestamptz, "updated_by" text,
    "created_at" timestamptz DEFAULT now() NOT NULL, "updated_at" timestamptz DEFAULT now() NOT NULL)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_app_user_idx" ON "admin"."subscriptions" ("app_id","user_id")`;
  await sql`ALTER TABLE "admin"."subscriptions" ADD COLUMN IF NOT EXISTS "trade_limit" integer DEFAULT 0 NOT NULL`;
  await sql`ALTER TABLE "admin"."subscriptions" ADD COLUMN IF NOT EXISTS "trade_period" text DEFAULT 'month' NOT NULL`;
  await sql`CREATE TABLE IF NOT EXISTS "admin"."plans" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "app_id" text NOT NULL, "code" text NOT NULL, "name" text NOT NULL,
    "price_minor_ngn" integer DEFAULT 0 NOT NULL, "trade_limit" integer DEFAULT 0 NOT NULL,
    "trade_period" text DEFAULT 'month' NOT NULL, "features" text,
    "active" boolean DEFAULT true NOT NULL, "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL, "updated_at" timestamptz DEFAULT now() NOT NULL)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS "plans_app_code_idx" ON "admin"."plans" ("app_id","code")`;
  const plansSeed = [
    ["aitrader", "free", "Free", 0, 20, "month", "Paper trading\n1 symbol\nManual scans\nCommunity strategies", 0],
    ["aitrader", "pro", "Pro", 1000000, 0, "month", "Live trading (Bybit, Binance, MT4/MT5)\nUnlimited symbols\nAuto scan loop\nExpectancy-based sizing\nPriority execution", 1],
  ];
  await sql`ALTER TABLE "admin"."plans" ADD COLUMN IF NOT EXISTS "is_default" boolean DEFAULT false NOT NULL`;
  for (const [app, code, name, price, tl, tp, feat, sort] of plansSeed)
    await sql`insert into admin.plans (app_id,code,name,price_minor_ngn,trade_limit,trade_period,features,sort_order)
      values (${app},${code},${name},${price},${tl},${tp},${feat},${sort})
      on conflict (app_id,code) do nothing`;
  // Mark "free" as the default fallback for aitrader if no default is set yet.
  await sql`update admin.plans set is_default = true
    where app_id='aitrader' and code='free'
      and not exists (select 1 from admin.plans where app_id='aitrader' and is_default=true)`;
  await sql`CREATE TABLE IF NOT EXISTS "admin"."audit_log" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "admin_id" uuid, "admin_email" text, "action" text NOT NULL, "target" text,
    "meta" jsonb, "created_at" timestamptz DEFAULT now() NOT NULL)`;
  await sql`CREATE INDEX IF NOT EXISTS "audit_created_idx" ON "admin"."audit_log" ("created_at")`;
  // seed the app registry
  const apps = [
    ["accounts","Spurs Accounts","http://127.0.0.1:8000","Identity provider (SSO)"],
    ["baas","Spurs BaaS","http://127.0.0.1:3000","Backend as a service"],
    ["pay","Spurs Pay","http://127.0.0.1:3100","Payment gateway"],
    ["wallet","Spurs Wallet","http://127.0.0.1:3200","Multi-asset wallet"],
    ["cloud","Spurs Cloud","http://127.0.0.1:8100","Domains + hosting"],
    ["survey","Spurs Survey","http://127.0.0.1:3400","Survey / task to earn"],
    ["aitrader","Spurs AI Trader","http://127.0.0.1:3800","Algorithmic trading engine"],
  ];
  for (const [id,name,url,desc] of apps)
    await sql`insert into admin.apps (id,name,base_url,description) values (${id},${name},${url},${desc}) on conflict (id) do update set name=excluded.name, base_url=excluded.base_url`;
  console.log("admin schema + app registry ready");
} finally { await sql.end(); }
