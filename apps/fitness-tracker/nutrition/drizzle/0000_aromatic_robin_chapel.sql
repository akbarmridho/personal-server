CREATE TABLE "favorite_foods" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"aliases" text[] NOT NULL,
	"calories" double precision NOT NULL,
	"protein_g" double precision NOT NULL,
	"carbs_g" double precision NOT NULL,
	"fat_g" double precision NOT NULL,
	"fiber_g" double precision,
	"portion" text,
	"references" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meal_time" timestamp with time zone NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"portion" text,
	"photo_file_ids" text[],
	"calories" double precision,
	"protein_g" double precision,
	"carbs_g" double precision,
	"fat_g" double precision,
	"fiber_g" double precision,
	"references" text[]
);
--> statement-breakpoint
CREATE TABLE "measurements" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"weight" double precision NOT NULL,
	"body_fat_pct" double precision,
	"body_fat_mass" double precision,
	"skeletal_muscle_mass" double precision,
	"visceral_fat_level" integer,
	"bmr" integer,
	"total_body_water" double precision,
	"bmi" double precision,
	"fat_free_mass" double precision,
	"smi" double precision,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "measurements_user_id_date_unique" UNIQUE("user_id","date")
);
--> statement-breakpoint
CREATE INDEX "measurements_user_id_date_index" ON "measurements" USING btree ("user_id","date");