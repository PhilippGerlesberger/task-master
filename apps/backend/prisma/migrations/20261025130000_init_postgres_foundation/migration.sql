-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "RepetitionKind" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "RepetitionMonthlyAnchor" AS ENUM ('SAME_DAY', 'END_OF_MONTH');

-- CreateTable
CREATE TABLE "lists" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "parent_list_id" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lists_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "lists"
    ADD CONSTRAINT "lists_parent_not_self_chk"
    CHECK ("parent_list_id" IS NULL OR "parent_list_id" <> "id");

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" SMALLINT,
    "estimate" DOUBLE PRECISION,
    "persistent_completed" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "repetition_kind" "RepetitionKind" NOT NULL DEFAULT 'NONE',
    "repetition_interval" INTEGER,
    "repetition_monthly_anchor" "RepetitionMonthlyAnchor",
    "repetition_count" INTEGER,
    "repetition_end_date" DATE,
    "schedule_start_date" DATE,
    "schedule_end_date" DATE,
    "schedule_default_end_time" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "tasks"
    ADD CONSTRAINT "tasks_priority_range_chk"
    CHECK ("priority" IS NULL OR "priority" BETWEEN 1 AND 5),
    ADD CONSTRAINT "tasks_estimate_non_negative_chk"
    CHECK ("estimate" IS NULL OR "estimate" >= 0);

-- CreateTable
CREATE TABLE "task_lists" (
    "task_id" TEXT NOT NULL,
    "list_id" TEXT NOT NULL,

    CONSTRAINT "task_lists_pkey" PRIMARY KEY ("task_id","list_id")
);

-- AddForeignKey
ALTER TABLE "lists"
    ADD CONSTRAINT "lists_parent_list_id_fkey"
    FOREIGN KEY ("parent_list_id") REFERENCES "lists"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE
    DEFERRABLE INITIALLY DEFERRED;

-- AddForeignKey
ALTER TABLE "task_lists" ADD CONSTRAINT "task_lists_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_lists" ADD CONSTRAINT "task_lists_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
