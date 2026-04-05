-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "invite_code" VARCHAR(6) NOT NULL,
    "host_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "settings" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlist_items" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "video_id" VARCHAR(20) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "thumbnail_url" VARCHAR(500),
    "duration" INTEGER,
    "channel_name" VARCHAR(100),
    "position" INTEGER NOT NULL,
    "added_by_name" VARCHAR(50),
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_members" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "user_id" UUID,
    "guest_name" VARCHAR(50),
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_invite_code_key" ON "rooms"("invite_code");

-- CreateIndex
CREATE INDEX "rooms_invite_code_idx" ON "rooms"("invite_code");

-- CreateIndex
CREATE INDEX "playlist_items_room_id_idx" ON "playlist_items"("room_id");

-- CreateIndex
CREATE INDEX "playlist_items_room_id_position_idx" ON "playlist_items"("room_id", "position");

-- CreateIndex
CREATE INDEX "room_members_room_id_idx" ON "room_members"("room_id");

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist_items" ADD CONSTRAINT "playlist_items_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
