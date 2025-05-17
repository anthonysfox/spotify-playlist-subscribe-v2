/*
  Warnings:

  - Added the required column `frequency` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SubscriptionFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "frequency" "SubscriptionFrequency" NOT NULL;
