ALTER TABLE "games" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "screenshots" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "platforms_available" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "stores_available" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "top_guide_url" text;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "top_guide_title" text;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "hltb_main_hours" real;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "hltb_main_extra_hours" real;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "hltb_completionist_hours" real;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "enriched_at" timestamp;