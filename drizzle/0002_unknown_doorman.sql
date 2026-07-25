CREATE TABLE "steam_connection" (
	"id" text PRIMARY KEY NOT NULL,
	"steam_id" text NOT NULL,
	"api_key" text NOT NULL,
	"connected_at" timestamp DEFAULT now() NOT NULL
);
