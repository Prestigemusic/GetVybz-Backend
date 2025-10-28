// src/cron/cloudinaryCleanup.js
import cron from "node-cron";
import { cloudinary } from "../config/cloudinary.js";
import User from "../models/User.js";
import { sendAdminEmail } from "../utils/email.js";
import logger from "../utils/logger.js";

/**
 * Folders to clean in Cloudinary
 * Add more folders here as needed
 */
const CLOUDINARY_FOLDERS = [
  "getvybz/profile_pictures",
  "getvybz/banner_images",
  "getvybz/gig_images"
];

/**
 * Weekly Cloudinary Cleanup
 * Runs every Sunday at 00:00
 */
export const scheduleCloudinaryCleanup = () => {
  cron.schedule("0 0 * * 0", async () => {
    logger.info("🧹 Starting Cloudinary cleanup job...");

    try {
      // 1️⃣ Collect all used public IDs from users
      const users = await User.find(
        {
          $or: [
            { profileImagePublicId: { $exists: true, $ne: "" } },
            { bannerImagePublicId: { $exists: true, $ne: "" } },
            { gigImagesPublicIds: { $exists: true, $ne: [] } }, // if gig images stored in array
          ],
        },
        "profileImagePublicId bannerImagePublicId gigImagesPublicIds"
      );

      const usedPublicIds = new Set();
      users.forEach(u => {
        if (u.profileImagePublicId) usedPublicIds.add(u.profileImagePublicId);
        if (u.bannerImagePublicId) usedPublicIds.add(u.bannerImagePublicId);
        if (u.gigImagesPublicIds && u.gigImagesPublicIds.length) {
          u.gigImagesPublicIds.forEach(id => usedPublicIds.add(id));
        }
      });

      let totalDeleted = 0;
      let totalFailed = 0;

      // 2️⃣ Iterate through each folder
      for (const folder of CLOUDINARY_FOLDERS) {
        const allFiles = [];
        let nextCursor = null;

        do {
          const res = await cloudinary.api.resources({
            type: "upload",
            prefix: folder,
            max_results: 100,
            next_cursor: nextCursor || undefined,
          });
          allFiles.push(...res.resources);
          nextCursor = res.next_cursor;
        } while (nextCursor);

        const orphaned = allFiles.filter(f => !usedPublicIds.has(f.public_id));
        logger.info(`Folder "${folder}": Found ${orphaned.length} orphaned file(s).`);

        // Delete orphaned files in parallel
        const deleteResults = await Promise.allSettled(
          orphaned.map(file => cloudinary.uploader.destroy(file.public_id))
        );

        const deletedCount = deleteResults.filter(r => r.status === "fulfilled").length;
        const failedCount = deleteResults.filter(r => r.status === "rejected").length;

        totalDeleted += deletedCount;
        totalFailed += failedCount;

        logger.info(`Folder "${folder}": ✅ Deleted ${deletedCount}, ❌ Failed ${failedCount}`);
      }

      // 3️⃣ Send summary email to admin
      const message = `
        <h2>Cloudinary Cleanup Completed</h2>
        <p><strong>${totalDeleted}</strong> orphaned file(s) deleted across ${CLOUDINARY_FOLDERS.length} folder(s).</p>
        <p><strong>${totalFailed}</strong> deletion(s) failed.</p>
        <p>Time: ${new Date().toLocaleString()}</p>
        <ul>
          ${CLOUDINARY_FOLDERS.map(f => `<li>${f}</li>`).join("")}
        </ul>
      `;
      await sendAdminEmail("🧹 Cloudinary Cleanup Report", message);

      logger.info(`✅ Cloudinary cleanup completed — ${totalDeleted} deleted, ${totalFailed} failed`);
    } catch (error) {
      logger.error("❌ Cloudinary cleanup failed:", error);

      await sendAdminEmail(
        "❌ Cloudinary Cleanup Failed",
        `<p>Error: ${error.message}</p>`
      );
    }
  });

  logger.info("🗓️ Cloudinary cleanup cron job scheduled (every Sunday at 00:00).");
};
