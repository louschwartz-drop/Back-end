// // import { Upload } from "@aws-sdk/lib-storage";
// // import fs from "fs";
// // import path from "path";
// // import os from "os";
// // import { execSync } from "child_process";
// // import s3Client from "../config/s3.js";

// // const YTDLP_PATH =
// //   "/var/www/html/droppr.ai-backend/node_modules/yt-dlp-exec/bin/yt-dlp";
// // const COOKIES_DIR = "/var/www/html/droppr.ai-backend";

// // /**
// //  * Run yt-dlp command manually so we can pass --js-runtimes node
// //  */
// // const runYtdlp = (args) => {
// //   const cmd = `${YTDLP_PATH} --js-runtimes node ${args}`;
// //   console.log(`[yt-dlp] Running: ${cmd}`);
// //   try {
// //     const output = execSync(cmd, {
// //       encoding: "utf8",
// //       stdio: ["pipe", "pipe", "pipe"],
// //       timeout: 120000, // 2 min timeout
// //     });
// //     return output;
// //   } catch (error) {
// //     const stderr = error.stderr || "";
// //     const stdout = error.stdout || "";
// //     console.error("[yt-dlp] stderr:", stderr);
// //     console.error("[yt-dlp] stdout:", stdout);
// //     throw new Error(stderr || stdout || error.message);
// //   }
// // };

// // /**
// //  * Clean and normalize social media URLs
// //  */
// // const cleanUrl = (url) => {
// //   const cleanedUrl = url.split("?")[0].split("#")[0];

// //   if (cleanedUrl.includes("instagram.com")) {
// //     const reelMatch = cleanedUrl.match(/\/reel[s]?\/([A-Za-z0-9_-]+)/);
// //     const pMatch = cleanedUrl.match(/\/p\/([A-Za-z0-9_-]+)/);
// //     if (reelMatch) return `https://www.instagram.com/reel/${reelMatch[1]}/`;
// //     if (pMatch) return `https://www.instagram.com/p/${pMatch[1]}/`;
// //   }

// //   if (cleanedUrl.includes("tiktok.com")) {
// //     return cleanedUrl.split("?")[0];
// //   }

// //   return cleanedUrl;
// // };

// // /**
// //  * Detect platform from URL
// //  */
// // const detectPlatform = (url) => {
// //   if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
// //   if (url.includes("tiktok.com")) return "tiktok";
// //   if (url.includes("instagram.com")) return "instagram";
// //   return "unknown";
// // };

// // /**
// //  * Build cookie flag based on platform
// //  */
// // const getCookieFlag = (platform) => {
// //   const cookieMap = {
// //     youtube: `${COOKIES_DIR}/youtube-cookies.txt`,
// //     instagram: `${COOKIES_DIR}/instagram-cookies.txt`,
// //     tiktok: `${COOKIES_DIR}/tiktok-cookies.txt`,
// //   };

// //   const cookiePath = cookieMap[platform];
// //   if (cookiePath && fs.existsSync(cookiePath)) {
// //     console.log(`[${platform}] ✓ Using cookies: ${cookiePath}`);
// //     return `--cookies "${cookiePath}"`;
// //   }

// //   console.warn(`[${platform}] ⚠ No cookie file found`);
// //   return "";
// // };

// // /**
// //  * Build platform-specific headers
// //  */
// // const getHeaderFlags = (platform) => {
// //   const headers = {
// //     youtube: [
// //       '--add-header "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"',
// //       '--add-header "Accept-Language:en-US,en;q=0.9"',
// //     ],
// //     instagram: [
// //       '--add-header "User-Agent:Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15"',
// //       '--add-header "Referer:https://www.instagram.com/"',
// //       '--add-header "X-IG-App-ID:936619743392459"',
// //     ],
// //     tiktok: [
// //       '--add-header "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"',
// //       '--add-header "Referer:https://www.tiktok.com/"',
// //     ],
// //   };

// //   return (headers[platform] || []).join(" ");
// // };

// // /**
// //  * Extracts audio from a social media link and uploads to S3
// //  */
// // export const extractAndUploadAudio = async (userId, videoUrl) => {
// //   const tempDir = os.tmpdir();
// //   const baseFileName = `social_audio_${Date.now()}`;
// //   const tempFilePath = path.join(tempDir, `${baseFileName}.mp3`);
// //   let thumbnail = null;
// //   let title = "No Title";
// //   let description = "No Description";
// //   let creatorAttribution = null;

// //   try {
// //     const cleanedUrl = cleanUrl(videoUrl);
// //     const platform = detectPlatform(cleanedUrl);
// //     console.log(`[Social] Processing: ${cleanedUrl} (Platform: ${platform})`);

// //     const cookieFlag = getCookieFlag(platform);
// //     const headerFlags = getHeaderFlags(platform);

// //     // ===== FETCH METADATA =====
// //     try {
// //       console.log(`[${platform}] Fetching metadata...`);
// //       const metaCmd = `${cookieFlag} ${headerFlags} --dump-json --no-check-certificates "${cleanedUrl}"`;
// //       const metaOutput = runYtdlp(metaCmd);
// //       const parsedMetadata = JSON.parse(metaOutput);

// //       title =
// //         parsedMetadata.title || parsedMetadata.description || "Social Video";
// //       description =
// //         parsedMetadata.description || parsedMetadata.title || "No Description";
// //       thumbnail =
// //         parsedMetadata.thumbnail || parsedMetadata.thumbnails?.[0]?.url || null;
// //       creatorAttribution =
// //         parsedMetadata.uploader || parsedMetadata.channel || null;

// //       console.log(`[${platform}] ✓ Title: ${title.substring(0, 50)}`);
// //       console.log(
// //         `[${platform}] ✓ Creator: ${creatorAttribution || "Unknown"}`,
// //       );
// //     } catch (metaError) {
// //       console.warn(`[${platform}] ⚠ Metadata failed:`, metaError.message);
// //     }

// //     // ===== EXTRACT AUDIO WITH FORMAT FALLBACKS =====
// //     console.log(`[${platform}] Extracting audio...`);

// //     const formats = [
// //       "bestaudio/best",
// //       "best",
// //       "bestvideo+bestaudio/best",
// //       "worst",
// //     ];
// //     let extracted = false;

// //     for (const format of formats) {
// //       try {
// //         console.log(`[${platform}] Trying format: ${format}...`);

// //         const extractCmd = `${cookieFlag} ${headerFlags} --extract-audio --audio-format mp3 --format "${format}" --no-check-certificates --retries 3 -o "${tempFilePath}" "${cleanedUrl}"`;
// //         runYtdlp(extractCmd);

// //         if (fs.existsSync(tempFilePath) && fs.statSync(tempFilePath).size > 0) {
// //           extracted = true;
// //           console.log(`[${platform}] ✓ Format "${format}" worked!`);
// //           break;
// //         }
// //       } catch (formatError) {
// //         console.warn(
// //           `[${platform}] ⚠ Format "${format}" failed:`,
// //           formatError.message,
// //         );
// //         if (fs.existsSync(tempFilePath)) {
// //           fs.unlinkSync(tempFilePath);
// //         }
// //         continue;
// //       }
// //     }

// //     if (!extracted) {
// //       throw new Error("All format attempts failed - video may be unavailable");
// //     }

// //     const fileSize = fs.statSync(tempFilePath).size;
// //     console.log(
// //       `[${platform}] ✓ Extracted (${(fileSize / 1024 / 1024).toFixed(2)} MB)`,
// //     );

// //     // ===== UPLOAD TO S3 =====
// //     console.log(`[${platform}] Uploading to S3...`);
// //     const fileStream = fs.createReadStream(tempFilePath);
// //     const s3Key = `campaigns/${userId}/${path.basename(tempFilePath)}`;

// //     const upload = new Upload({
// //       client: s3Client,
// //       params: {
// //         Bucket: process.env.AWS_BUCKET_NAME,
// //         Key: s3Key,
// //         Body: fileStream,
// //         ContentType: "audio/mpeg",
// //       },
// //     });

// //     await upload.done();
// //     const s3Url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
// //     console.log(`[${platform}] ✓ Success! ${s3Url}`);

// //     return {
// //       audioUrl: s3Url,
// //       videoThumbnail: thumbnail,
// //       title: title.substring(0, 200),
// //       description: description.substring(0, 500),
// //       creatorAttribution,
// //       localFilePath: tempFilePath,
// //     };
// //   } catch (error) {
// //     console.error("[Social Error] ✗", error.message);

// //     if (fs.existsSync(tempFilePath)) {
// //       try {
// //         fs.unlinkSync(tempFilePath);
// //       } catch {}
// //     }

// //     let errorMessage = error.message;
// //     if (
// //       error.message.includes("Sign in") ||
// //       error.message.includes("not a bot")
// //     ) {
// //       errorMessage = "YouTube auth failed. Re-export cookies.";
// //     } else if (error.message.includes("Unsupported URL")) {
// //       errorMessage = "Invalid or unsupported URL format.";
// //     } else if (error.message.includes("Private")) {
// //       errorMessage = "Content is private.";
// //     }

// //     throw new Error(`Failed to extract audio: ${errorMessage}`);
// //   }
// // };
// import { Upload } from "@aws-sdk/lib-storage";
// import fs from "fs";
// import path from "path";
// import os from "os";
// import { execFile } from "child_process";
// import { promisify } from "util";
// import s3Client from "../config/s3.js";

// const execFileAsync = promisify(execFile);

// const YTDLP_PATH =
//   "/var/www/html/droppr.ai-backend/node_modules/yt-dlp-exec/bin/yt-dlp";
// const COOKIES_DIR = "/var/www/html/droppr.ai-backend";

// /**
//  * Run yt-dlp asynchronously with --js-runtimes node
//  */
// const runYtdlp = async (args) => {
//   console.log(`[yt-dlp] Running with args: ${args.join(" ")}`);
//   try {
//     const { stdout, stderr } = await execFileAsync(YTDLP_PATH, args, {
//       timeout: 120000,
//       maxBuffer: 50 * 1024 * 1024, // 50MB buffer
//     });
//     return stdout;
//   } catch (error) {
//     const stderr = error.stderr || "";
//     const stdout = error.stdout || "";
//     console.error("[yt-dlp] stderr:", stderr);
//     throw new Error(stderr || stdout || error.message);
//   }
// };

// /**
//  * Clean and normalize social media URLs
//  */
// const cleanUrl = (url) => {
//   const cleanedUrl = url.split("?")[0].split("#")[0];

//   if (cleanedUrl.includes("instagram.com")) {
//     const reelMatch = cleanedUrl.match(/\/reel[s]?\/([A-Za-z0-9_-]+)/);
//     const pMatch = cleanedUrl.match(/\/p\/([A-Za-z0-9_-]+)/);
//     if (reelMatch) return `https://www.instagram.com/reel/${reelMatch[1]}/`;
//     if (pMatch) return `https://www.instagram.com/p/${pMatch[1]}/`;
//   }

//   if (cleanedUrl.includes("tiktok.com")) {
//     return cleanedUrl.split("?")[0];
//   }

//   return cleanedUrl;
// };

// /**
//  * Detect platform from URL
//  */
// const detectPlatform = (url) => {
//   if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
//   if (url.includes("tiktok.com")) return "tiktok";
//   if (url.includes("instagram.com")) return "instagram";
//   return "unknown";
// };

// /**
//  * Get cookie file path for platform
//  */
// const getCookiePath = (platform) => {
//   const cookieMap = {
//     youtube: `${COOKIES_DIR}/youtube-cookies.txt`,
//     instagram: `${COOKIES_DIR}/instagram-cookies.txt`,
//     tiktok: `${COOKIES_DIR}/tiktok-cookies.txt`,
//   };

//   const cookiePath = cookieMap[platform];
//   if (cookiePath && fs.existsSync(cookiePath)) {
//     console.log(`[${platform}] ✓ Using cookies: ${cookiePath}`);
//     return cookiePath;
//   }

//   console.warn(`[${platform}] ⚠ No cookie file found`);
//   return null;
// };

// /**
//  * Build base args array (shared options)
//  */
// const getBaseArgs = (platform, cookiePath) => {
//   const args = ["--js-runtimes", "node", "--no-check-certificates"];

//   // Add cookies
//   if (cookiePath) {
//     args.push("--cookies", cookiePath);
//   }

//   // Platform-specific headers
//   if (platform === "youtube") {
//     args.push(
//       "--add-header",
//       "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
//       "--add-header",
//       "Accept-Language:en-US,en;q=0.9",
//     );
//   } else if (platform === "instagram") {
//     args.push(
//       "--add-header",
//       "User-Agent:Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
//       "--add-header",
//       "Referer:https://www.instagram.com/",
//       "--add-header",
//       "X-IG-App-ID:936619743392459",
//     );
//   } else if (platform === "tiktok") {
//     args.push(
//       "--add-header",
//       "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
//       "--add-header",
//       "Referer:https://www.tiktok.com/",
//     );
//   }

//   return args;
// };

// /**
//  * Extracts audio from a social media link and uploads to S3
//  */
// export const extractAndUploadAudio = async (userId, videoUrl) => {
//   const tempDir = os.tmpdir();
//   const baseFileName = `social_audio_${Date.now()}`;
//   const tempFilePath = path.join(tempDir, `${baseFileName}.mp3`);
//   let thumbnail = null;
//   let title = "No Title";
//   let description = "No Description";
//   let creatorAttribution = null;

//   try {
//     const cleanedUrl = cleanUrl(videoUrl);
//     const platform = detectPlatform(cleanedUrl);
//     console.log(`[Social] Processing: ${cleanedUrl} (Platform: ${platform})`);

//     const cookiePath = getCookiePath(platform);
//     const baseArgs = getBaseArgs(platform, cookiePath);

//     // ===== FETCH METADATA =====
//     try {
//       console.log(`[${platform}] Fetching metadata...`);

//       const metaArgs = [...baseArgs, "--dump-json", cleanedUrl];
//       const metaOutput = await runYtdlp(metaArgs);
//       const parsedMetadata = JSON.parse(metaOutput);

//       title =
//         parsedMetadata.title || parsedMetadata.description || "Social Video";
//       description =
//         parsedMetadata.description || parsedMetadata.title || "No Description";
//       thumbnail =
//         parsedMetadata.thumbnail || parsedMetadata.thumbnails?.[0]?.url || null;
//       creatorAttribution =
//         parsedMetadata.uploader || parsedMetadata.channel || null;

//       console.log(`[${platform}] ✓ Title: ${title.substring(0, 50)}`);
//       console.log(
//         `[${platform}] ✓ Creator: ${creatorAttribution || "Unknown"}`,
//       );
//     } catch (metaError) {
//       console.warn(`[${platform}] ⚠ Metadata failed:`, metaError.message);
//     }

//     // ===== EXTRACT AUDIO WITH FORMAT FALLBACKS =====
//     console.log(`[${platform}] Extracting audio...`);

//     const formats = [
//       "bestaudio/best",
//       "best",
//       "bestvideo+bestaudio/best",
//       "worst",
//     ];
//     let extracted = false;

//     for (const format of formats) {
//       try {
//         console.log(`[${platform}] Trying format: ${format}...`);

//         const extractArgs = [
//           ...baseArgs,
//           "--extract-audio",
//           "--audio-format",
//           "mp3",
//           "--format",
//           format,
//           "--retries",
//           "3",
//           "-o",
//           tempFilePath,
//           cleanedUrl,
//         ];

//         await runYtdlp(extractArgs);

//         if (fs.existsSync(tempFilePath) && fs.statSync(tempFilePath).size > 0) {
//           extracted = true;
//           console.log(`[${platform}] ✓ Format "${format}" worked!`);
//           break;
//         }
//       } catch (formatError) {
//         console.warn(
//           `[${platform}] ⚠ Format "${format}" failed:`,
//           formatError.message,
//         );
//         if (fs.existsSync(tempFilePath)) {
//           fs.unlinkSync(tempFilePath);
//         }
//         continue;
//       }
//     }

//     if (!extracted) {
//       throw new Error("All format attempts failed - video may be unavailable");
//     }

//     const fileSize = fs.statSync(tempFilePath).size;
//     console.log(
//       `[${platform}] ✓ Extracted (${(fileSize / 1024 / 1024).toFixed(2)} MB)`,
//     );

//     // ===== UPLOAD TO S3 =====
//     console.log(`[${platform}] Uploading to S3...`);
//     const fileStream = fs.createReadStream(tempFilePath);
//     const s3Key = `campaigns/${userId}/${path.basename(tempFilePath)}`;

//     const upload = new Upload({
//       client: s3Client,
//       params: {
//         Bucket: process.env.AWS_BUCKET_NAME,
//         Key: s3Key,
//         Body: fileStream,
//         ContentType: "audio/mpeg",
//       },
//     });

//     await upload.done();
//     const s3Url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
//     console.log(`[${platform}] ✓ Success! ${s3Url}`);

//     return {
//       audioUrl: s3Url,
//       videoThumbnail: thumbnail,
//       title: title.substring(0, 200),
//       description: description.substring(0, 500),
//       creatorAttribution,
//       localFilePath: tempFilePath,
//     };
//   } catch (error) {
//     console.error("[Social Error] ✗", error.message);

//     if (fs.existsSync(tempFilePath)) {
//       try {
//         fs.unlinkSync(tempFilePath);
//       } catch {}
//     }

//     let errorMessage = error.message;
//     if (
//       error.message.includes("Sign in") ||
//       error.message.includes("not a bot")
//     ) {
//       errorMessage = "YouTube auth failed. Re-export cookies.";
//     } else if (error.message.includes("Unsupported URL")) {
//       errorMessage = "Invalid or unsupported URL.";
//     } else if (error.message.includes("Private")) {
//       errorMessage = "Content is private.";
//     }

//     throw new Error(`Failed to extract audio: ${errorMessage}`);
//   }
// };

import { Upload } from "@aws-sdk/lib-storage";
import fs from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import s3Client from "../config/s3.js";

const execFileAsync = promisify(execFile);

// ===== AUTO-DETECT YT-DLP PATH =====
const detectYtDlpPath = () => {
  const possiblePaths = [
    "/var/www/html/droppr.ai-backend/node_modules/yt-dlp-exec/bin/yt-dlp",
    "/usr/local/bin/yt-dlp",
    "/usr/bin/yt-dlp",
    path.join(process.cwd(), "node_modules/yt-dlp-exec/bin/yt-dlp"),
  ];

  console.log("🔍 [DEBUG] Searching for yt-dlp...");
  for (const p of possiblePaths) {
    console.log(`   Checking: ${p}`);
    if (fs.existsSync(p)) {
      console.log(`   ✅ Found at: ${p}\n`);
      return p;
    }
  }

  console.error("❌ [ERROR] yt-dlp NOT FOUND!");
  console.error("Install it: npm install yt-dlp-exec");
  throw new Error("yt-dlp binary not found");
};

const YTDLP_PATH = detectYtDlpPath();
const COOKIES_DIR = "/var/www/html/droppr.ai-backend";

/**
 * Run yt-dlp asynchronously with detailed debugging
 */
const runYtdlp = async (args) => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🚀 [yt-dlp] EXECUTING COMMAND");
  console.log(`📍 Binary: ${YTDLP_PATH}`);
  console.log(`📝 Args: ${args.join(" ")}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    const startTime = Date.now();
    const { stdout, stderr } = await execFileAsync(YTDLP_PATH, args, {
      timeout: 120000,
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ [yt-dlp] SUCCESS (${duration}s)\n`);

    if (stderr) {
      console.log("⚠️  [yt-dlp] STDERR OUTPUT:");
      console.log(stderr);
      console.log("");
    }

    return stdout;
  } catch (error) {
    const duration = ((Date.now() - error.killed ? Date.now() : 0) / 1000).toFixed(2);
    console.error(`❌ [yt-dlp] FAILED (${duration}s)`);
    console.error("📛 Error Code:", error.code);
    console.error("📛 Exit Code:", error.exitCode);
    
    if (error.stderr) {
      console.error("\n🔴 STDERR:");
      console.error(error.stderr);
    }
    if (error.stdout) {
      console.error("\n📄 STDOUT:");
      console.error(error.stdout);
    }
    console.error("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const stderr = error.stderr || "";
    const stdout = error.stdout || "";
    throw new Error(stderr || stdout || error.message);
  }
};

/**
 * Clean and normalize social media URLs
 */
const cleanUrl = (url) => {
  console.log(`🧹 [URL] Cleaning: ${url}`);
  const cleanedUrl = url.split("?")[0].split("#")[0];

  if (cleanedUrl.includes("instagram.com")) {
    const reelMatch = cleanedUrl.match(/\/reel[s]?\/([A-Za-z0-9_-]+)/);
    const pMatch = cleanedUrl.match(/\/p\/([A-Za-z0-9_-]+)/);
    if (reelMatch) {
      const normalized = `https://www.instagram.com/reel/${reelMatch[1]}/`;
      console.log(`   ✅ Normalized (Instagram Reel): ${normalized}\n`);
      return normalized;
    }
    if (pMatch) {
      const normalized = `https://www.instagram.com/p/${pMatch[1]}/`;
      console.log(`   ✅ Normalized (Instagram Post): ${normalized}\n`);
      return normalized;
    }
  }

  if (cleanedUrl.includes("tiktok.com")) {
    const normalized = cleanedUrl.split("?")[0];
    console.log(`   ✅ Normalized (TikTok): ${normalized}\n`);
    return normalized;
  }

  console.log(`   ✅ Cleaned: ${cleanedUrl}\n`);
  return cleanedUrl;
};

/**
 * Detect platform from URL
 */
const detectPlatform = (url) => {
  console.log(`🔍 [PLATFORM] Detecting from URL: ${url}`);
  
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    console.log(`   ✅ Detected: YouTube\n`);
    return "youtube";
  }
  if (url.includes("tiktok.com")) {
    console.log(`   ✅ Detected: TikTok\n`);
    return "tiktok";
  }
  if (url.includes("instagram.com")) {
    console.log(`   ✅ Detected: Instagram\n`);
    return "instagram";
  }
  
  console.log(`   ⚠️  Detected: Unknown\n`);
  return "unknown";
};

/**
 * Get cookie file path for platform
 */
const getCookiePath = (platform) => {
  console.log(`🍪 [COOKIES] Checking for ${platform} cookies...`);
  
  const cookieMap = {
    youtube: `${COOKIES_DIR}/youtube-cookies.txt`,
    instagram: `${COOKIES_DIR}/instagram-cookies.txt`,
    tiktok: `${COOKIES_DIR}/tiktok-cookies.txt`,
  };

  const cookiePath = cookieMap[platform];
  
  if (cookiePath && fs.existsSync(cookiePath)) {
    const stats = fs.statSync(cookiePath);
    const ageInDays = (Date.now() - stats.mtime) / (1000 * 60 * 60 * 24);
    const size = stats.size;
    
    console.log(`   ✅ Found: ${cookiePath}`);
    console.log(`   📊 Size: ${size} bytes`);
    console.log(`   📅 Age: ${ageInDays.toFixed(1)} days old`);
    
    if (ageInDays > 30) {
      console.log(`   ⚠️  WARNING: Cookies are >30 days old, may be expired!`);
    }
    console.log("");
    return cookiePath;
  }

  console.warn(`   ⚠️  No cookie file found at: ${cookiePath || "N/A"}\n`);
  return null;
};

/**
 * Build base args array (shared options)
 */
const getBaseArgs = (platform, cookiePath) => {
  console.log(`⚙️  [ARGS] Building base arguments for ${platform}...`);
  
  const args = [
    "--js-runtimes", "node",
    "--no-check-certificates",
    "--verbose" // Added for better debugging
  ];

  // Add cookies
  if (cookiePath) {
    args.push("--cookies", cookiePath);
    console.log(`   ✅ Added cookies: ${cookiePath}`);
  } else {
    console.log(`   ⚠️  No cookies added`);
  }

  // Platform-specific headers
  if (platform === "youtube") {
    args.push(
      "--add-header",
      "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "--add-header",
      "Accept-Language:en-US,en;q=0.9"
    );
    console.log(`   ✅ Added YouTube headers`);
  } else if (platform === "instagram") {
    args.push(
      "--add-header",
      "User-Agent:Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
      "--add-header",
      "Referer:https://www.instagram.com/",
      "--add-header",
      "X-IG-App-ID:936619743392459"
    );
    console.log(`   ✅ Added Instagram headers`);
  } else if (platform === "tiktok") {
    args.push(
      "--add-header",
      "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "--add-header",
      "Referer:https://www.tiktok.com/"
    );
    console.log(`   ✅ Added TikTok headers`);
  }

  console.log(`   📋 Total args: ${args.length}\n`);
  return args;
};

/**
 * Extracts audio from a social media link and uploads to S3
 */
export const extractAndUploadAudio = async (userId, videoUrl) => {
  console.log("\n");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("🎬 STARTING AUDIO EXTRACTION PROCESS");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`👤 User ID: ${userId}`);
  console.log(`🔗 Video URL: ${videoUrl}`);
  console.log(`⏰ Start Time: ${new Date().toISOString()}`);
  console.log("═══════════════════════════════════════════════════════════\n");

  const tempDir = os.tmpdir();
  const baseFileName = `social_audio_${Date.now()}`;
  const tempFilePath = path.join(tempDir, `${baseFileName}.mp3`);
  
  console.log(`📁 [TEMP] Directory: ${tempDir}`);
  console.log(`📄 [TEMP] File will be: ${tempFilePath}\n`);

  let thumbnail = null;
  let title = "No Title";
  let description = "No Description";
  let creatorAttribution = null;

  try {
    const cleanedUrl = cleanUrl(videoUrl);
    const platform = detectPlatform(cleanedUrl);
    
    console.log(`\n┌─────────────────────────────────────────┐`);
    console.log(`│ PLATFORM: ${platform.toUpperCase().padEnd(30)} │`);
    console.log(`│ URL: ${cleanedUrl.substring(0, 30).padEnd(30)}... │`);
    console.log(`└─────────────────────────────────────────┘\n`);

    const cookiePath = getCookiePath(platform);
    const baseArgs = getBaseArgs(platform, cookiePath);

    // ===== STEP 1: FETCH METADATA =====
    console.log("\n╔═══════════════════════════════════════╗");
    console.log("║  STEP 1: FETCHING METADATA           ║");
    console.log("╚═══════════════════════════════════════╝\n");

    try {
      const metaArgs = [...baseArgs, "--dump-json", cleanedUrl];
      const metaOutput = await runYtdlp(metaArgs);
      
      console.log("📊 [METADATA] Parsing JSON response...");
      const parsedMetadata = JSON.parse(metaOutput);

      title = parsedMetadata.title || parsedMetadata.description || "Social Video";
      description = parsedMetadata.description || parsedMetadata.title || "No Description";
      thumbnail = parsedMetadata.thumbnail || parsedMetadata.thumbnails?.[0]?.url || null;
      creatorAttribution = parsedMetadata.uploader || parsedMetadata.channel || null;

      console.log("\n✅ [METADATA] Successfully extracted:");
      console.log(`   📌 Title: ${title.substring(0, 70)}`);
      console.log(`   👤 Creator: ${creatorAttribution || "Unknown"}`);
      console.log(`   🖼️  Thumbnail: ${thumbnail ? "✓ Available" : "✗ Not found"}`);
      console.log(`   📝 Description length: ${description.length} chars\n`);
    } catch (metaError) {
      console.warn("\n⚠️  [METADATA] Failed to fetch metadata");
      console.warn(`   Reason: ${metaError.message}`);
      console.warn(`   Continuing without metadata...\n`);
    }

    // ===== STEP 2: EXTRACT AUDIO WITH FORMAT FALLBACKS =====
    console.log("\n╔═══════════════════════════════════════╗");
    console.log("║  STEP 2: EXTRACTING AUDIO            ║");
    console.log("╚═══════════════════════════════════════╝\n");

    const formats = [
      "bestaudio/best",
      "best",
      "bestvideo+bestaudio/best",
      "worst",
    ];
    
    let extracted = false;
    let attemptNumber = 0;

    for (const format of formats) {
      attemptNumber++;
      console.log(`\n┌─ ATTEMPT ${attemptNumber}/${formats.length} ────────────────────────┐`);
      console.log(`│ Format: ${format.padEnd(35)} │`);
      console.log(`└────────────────────────────────────────┘\n`);

      try {
        const extractArgs = [
          ...baseArgs,
          "--extract-audio",
          "--audio-format", "mp3",
          "--format", format,
          "--retries", "3",
          "-o", tempFilePath,
          cleanedUrl,
        ];

        await runYtdlp(extractArgs);

        // Check if file was created
        console.log(`🔍 [FILE CHECK] Verifying ${tempFilePath}...`);
        
        if (fs.existsSync(tempFilePath)) {
          const stats = fs.statSync(tempFilePath);
          const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
          
          console.log(`   ✅ File exists`);
          console.log(`   📊 Size: ${stats.size} bytes (${sizeMB} MB)`);
          
          if (stats.size > 0) {
            extracted = true;
            console.log(`\n🎉 SUCCESS! Format "${format}" worked!`);
            console.log(`📁 Audio saved to: ${tempFilePath}\n`);
            break;
          } else {
            console.log(`   ❌ File is EMPTY (0 bytes)`);
            fs.unlinkSync(tempFilePath);
            console.log(`   🗑️  Deleted empty file\n`);
          }
        } else {
          console.log(`   ❌ File was NOT created\n`);
        }
      } catch (formatError) {
        console.error(`\n❌ Format "${format}" FAILED`);
        console.error(`   Error: ${formatError.message}\n`);
        
        if (fs.existsSync(tempFilePath)) {
          console.log(`   🗑️  Cleaning up failed attempt...`);
          fs.unlinkSync(tempFilePath);
        }
        continue;
      }
    }

    if (!extracted) {
      console.error("\n╔═══════════════════════════════════════╗");
      console.error("║  ❌ ALL EXTRACTION ATTEMPTS FAILED   ║");
      console.error("╚═══════════════════════════════════════╝\n");
      console.error("Possible reasons:");
      console.error("  • Video is private or deleted");
      console.error("  • Cookies are expired or invalid");
      console.error("  • Region-locked content");
      console.error("  • Platform blocking yt-dlp");
      console.error("  • Network/timeout issues\n");
      
      throw new Error("All format attempts failed - video may be unavailable");
    }

    const fileSize = fs.statSync(tempFilePath).size;
    const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
    
    console.log("\n✅ [EXTRACTION] Complete!");
    console.log(`   📊 Final file size: ${fileSizeMB} MB\n`);

    // ===== STEP 3: UPLOAD TO S3 =====
    console.log("\n╔═══════════════════════════════════════╗");
    console.log("║  STEP 3: UPLOADING TO S3             ║");
    console.log("╚═══════════════════════════════════════╝\n");

    const fileStream = fs.createReadStream(tempFilePath);
    const s3Key = `campaigns/${userId}/${path.basename(tempFilePath)}`;

    console.log(`☁️  [S3] Starting upload...`);
    console.log(`   Bucket: ${process.env.AWS_BUCKET_NAME}`);
    console.log(`   Region: ${process.env.AWS_REGION}`);
    console.log(`   Key: ${s3Key}`);
    console.log(`   Size: ${fileSizeMB} MB\n`);

    const uploadStartTime = Date.now();
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: s3Key,
        Body: fileStream,
        ContentType: "audio/mpeg",
      },
    });

    await upload.done();
    
    const uploadDuration = ((Date.now() - uploadStartTime) / 1000).toFixed(2);
    const s3Url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    
    console.log(`✅ [S3] Upload complete! (${uploadDuration}s)`);
    console.log(`🔗 URL: ${s3Url}\n`);

    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("🎉 PROCESS COMPLETED SUCCESSFULLY");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`⏰ End Time: ${new Date().toISOString()}`);
    console.log("═══════════════════════════════════════════════════════════\n");

    return {
      audioUrl: s3Url,
      videoThumbnail: thumbnail,
      title: title.substring(0, 200),
      description: description.substring(0, 500),
      creatorAttribution,
      localFilePath: tempFilePath,
    };
  } catch (error) {
    console.error("\n");
    console.error("╔═══════════════════════════════════════════════════════════╗");
    console.error("║  💥 FATAL ERROR - PROCESS FAILED                         ║");
    console.error("╚═══════════════════════════════════════════════════════════╝");
    console.error(`⏰ Failed at: ${new Date().toISOString()}`);
    console.error(`❌ Error: ${error.message}`);
    console.error(`📚 Stack: ${error.stack}\n`);

    if (fs.existsSync(tempFilePath)) {
      try {
        console.log(`🗑️  Cleaning up temp file: ${tempFilePath}`);
        fs.unlinkSync(tempFilePath);
        console.log(`✅ Cleanup successful\n`);
      } catch (cleanupError) {
        console.error(`⚠️  Cleanup failed: ${cleanupError.message}\n`);
      }
    }

    let errorMessage = error.message;
    if (error.message.includes("Sign in") || error.message.includes("not a bot")) {
      errorMessage = "YouTube auth failed. Re-export cookies.";
    } else if (error.message.includes("Unsupported URL")) {
      errorMessage = "Invalid or unsupported URL.";
    } else if (error.message.includes("Private")) {
      errorMessage = "Content is private.";
    } else if (error.message.includes("yt-dlp binary not found")) {
      errorMessage = "yt-dlp not installed. Run: npm install yt-dlp-exec";
    }

    console.error("╔═══════════════════════════════════════════════════════════╗");
    console.error(`║  User-facing error: ${errorMessage.padEnd(40)} ║`);
    console.error("╚═══════════════════════════════════════════════════════════╝\n");

    throw new Error(`Failed to extract audio: ${errorMessage}`);
  }
};