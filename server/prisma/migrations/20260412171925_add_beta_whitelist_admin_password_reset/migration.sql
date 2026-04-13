/*
  Warnings:

  - A unique constraint covering the columns `[reset_token]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_admin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reset_token" VARCHAR(255),
ADD COLUMN     "reset_token_expiry" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "beta_whitelist" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beta_whitelist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "beta_whitelist_email_key" ON "beta_whitelist"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_reset_token_key" ON "users"("reset_token");
