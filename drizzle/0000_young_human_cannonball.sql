CREATE TABLE "games" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"source_id" text,
	"platform" text NOT NULL,
	"title" text NOT NULL,
	"playtime" real DEFAULT 0 NOT NULL,
	"playtime_recent" real DEFAULT 0 NOT NULL,
	"last_played_at" timestamp,
	"achievement_pct" integer,
	"genres" text[] DEFAULT '{}' NOT NULL,
	"cover_path" text,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_synced_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"seen_at" timestamp DEFAULT now() NOT NULL,
	"playtime_delta" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_games" (
	"game_id" text PRIMARY KEY NOT NULL,
	"finished" boolean DEFAULT false NOT NULL,
	"finished_at" timestamp,
	"note" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"manual_playtime" real
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_games" ADD CONSTRAINT "user_games_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "games_playtime_idx" ON "games" USING btree ("playtime");--> statement-breakpoint
CREATE INDEX "games_last_played_idx" ON "games" USING btree ("last_played_at");--> statement-breakpoint
CREATE INDEX "sessions_game_idx" ON "sessions" USING btree ("game_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_game_seen_idx" ON "sessions" USING btree ("game_id","seen_at");