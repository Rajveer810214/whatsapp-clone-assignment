// processWebhookFiles.ts - Script to process the provided JSON files
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { Message } from "./models.js";
import { processWebhookPayload } from "./processPayload.js";
import dotenv from "dotenv";

dotenv.config();

// Connect to MongoDB
const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error(
        "MONGODB_URI environment variable is not defined. Please check your .env file."
      );
    }

    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Create indexes for better performance
    await Message.createIndexes();
    console.log("✅ Database indexes created");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
};

// Main function to process all JSON files
const processAllFiles = async (): Promise<void> => {
  await connectDB();

  const filesDir = "./webhook_files"; // Adjust path as needed

  try {
    if (!fs.existsSync(filesDir)) {
      console.error(
        `❌ Directory ${filesDir} does not exist. Please create it and add your JSON files.`
      );
      console.log("💡 To create the directory and add files:");
      console.log("   mkdir webhook_files");
      console.log(
        "   # Then copy your JSON files to the webhook_files/ directory"
      );
      process.exit(1);
    }

    const files = fs
      .readdirSync(filesDir)
      .filter((file) => file.endsWith(".json"));

    if (files.length === 0) {
      console.log("❌ No JSON files found in webhook_files directory");
      console.log(
        "💡 Please add your webhook JSON files to the webhook_files/ directory"
      );
      process.exit(1);
    }

    console.log(`📁 Found ${files.length} JSON files to process`);

    // Sort files to process messages before status updates for proper flow
    const messageFiles = files.filter((f) => f.includes("message")).sort();
    const statusFiles = files.filter((f) => f.includes("status")).sort();
    const otherFiles = files
      .filter((f) => !f.includes("message") && !f.includes("status"))
      .sort();
    const sortedFiles = [...messageFiles, ...statusFiles, ...otherFiles];

    console.log("\n📋 Processing order:");
    sortedFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });

    let successCount = 0;
    let errorCount = 0;

    for (const file of sortedFiles) {
      const filePath = path.join(filesDir, file);

      try {
        const fileContent = fs.readFileSync(filePath, "utf8");
        const payload = JSON.parse(fileContent);

        console.log(`\n📄 Processing ${file}...`);
        await processWebhookPayload(payload);
        successCount++;

        // Small delay to ensure proper order
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (fileError) {
        console.error(
          `❌ Error processing ${file}:`,
          fileError instanceof Error ? fileError.message : "Unknown error"
        );
        errorCount++;
      }
    }

    console.log("\n📊 Processing Summary:");
    console.log(`✅ Successfully processed: ${successCount} files`);
    console.log(`❌ Failed to process: ${errorCount} files`);

    const totalMessages = await Message.countDocuments();
    const totalConversations = (await Message.distinct("conversationId"))
      .length;

    console.log(`📈 Total messages in database: ${totalMessages}`);
    console.log(`💬 Total conversations: ${totalConversations}`);

    // Show sample data
    const sampleMessages = await Message.find().limit(3).sort({ timestamp: 1 });
    if (sampleMessages.length > 0) {
      console.log("\n📋 Sample messages:");
      sampleMessages.forEach((msg, index) => {
        console.log(
          `  ${index + 1}. [${msg.conversationId}] ${
            msg.userName
          }: ${msg.body.substring(0, 50)}${msg.body.length > 50 ? "..." : ""}`
        );
      });
    }

    console.log("\n✅ All files processed successfully!");
    console.log("\n🚀 Next steps:");
    console.log('   1. Run "npm run dev" to start the development server');
    console.log("   2. Open your browser to see the WhatsApp Web interface");
    console.log("   3. Your conversations should be visible in the UI");
  } catch (error) {
    console.error("❌ Error reading files:", error);
  } finally {
    mongoose.connection.close();
    console.log("👋 Database connection closed");
  }
};

// Run the script
console.log("🚀 Starting webhook payload processing...\n");
processAllFiles().catch((error) => {
  console.error("💥 Script failed:", error);
  mongoose.connection.close();
  process.exit(1);
});
