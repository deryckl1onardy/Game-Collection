ALTER TABLE "steam_connection" ALTER COLUMN "api_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "steam_connection" ADD COLUMN "mode" text NOT NULL DEFAULT 'api-key';--> statement-breakpoint
ALTER TABLE "steam_connection" ALTER COLUMN "mode" DROP DEFAULT;