// import { Upload } from "@aws-sdk/lib-storage";
// import fs from "fs";
// import path from "path";
// import os from "os";
// import { execSync } from "child_process";
// import s3Client from "../config/s3.js";

// const YTDLP_PATH =
//   "/var/www/html/droppr.ai-backend/node_modules/yt-dlp-exec/bin/yt-dlp";
// const COOKIES_DIR = "/var/www/html/droppr.ai-backend";

// /**
//  * Run yt-dlp command manually so we can pass --js-runtimes node
//  */
// const runYtdlp = (args) => {
//   const cmd = `${YTDLP_PATH} --js-runtimes node ${args}`;
//   console.log(`[yt-dlp] Running: ${cmd}`);
//   try {
//     const output = execSync(cmd, {
//       encoding: "utf8",
//       stdio: ["pipe", "pipe", "pipe"],
//       timeout: 120000, // 2 min timeout
//     });
//     return output;
//   } catch (error) {
//     const stderr = error.stderr || "";
//     const stdout = error.stdout || "";
//     console.error("[yt-dlp] stderr:", stderr);
//     console.error("[yt-dlp] stdout:", stdout);
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
//  * Build cookie flag based on platform
//  */
// const getCookieFlag = (platform) => {
//   const cookieMap = {
//     youtube: `${COOKIES_DIR}/youtube-cookies.txt`,
//     instagram: `${COOKIES_DIR}/instagram-cookies.txt`,
//     tiktok: `${COOKIES_DIR}/tiktok-cookies.txt`,
//   };

//   const cookiePath = cookieMap[platform];
//   if (cookiePath && fs.existsSync(cookiePath)) {
//     console.log(`[${platform}] ✓ Using cookies: ${cookiePath}`);
//     return `--cookies "${cookiePath}"`;
//   }

//   console.warn(`[${platform}] ⚠ No cookie file found`);
//   return "";
// };

// /**
//  * Build platform-specific headers
//  */
// const getHeaderFlags = (platform) => {
//   const headers = {
//     youtube: [
//       '--add-header "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"',
//       '--add-header "Accept-Language:en-US,en;q=0.9"',
//     ],
//     instagram: [
//       '--add-header "User-Agent:Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15"',
//       '--add-header "Referer:https://www.instagram.com/"',
//       '--add-header "X-IG-App-ID:936619743392459"',
//     ],
//     tiktok: [
//       '--add-header "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"',
//       '--add-header "Referer:https://www.tiktok.com/"',
//     ],
//   };

//   return (headers[platform] || []).join(" ");
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

//     const cookieFlag = getCookieFlag(platform);
//     const headerFlags = getHeaderFlags(platform);

//     // ===== FETCH METADATA =====
//     try {
//       console.log(`[${platform}] Fetching metadata...`);
//       const metaCmd = `${cookieFlag} ${headerFlags} --dump-json --no-check-certificates "${cleanedUrl}"`;
//       const metaOutput = runYtdlp(metaCmd);
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

//         const extractCmd = `${cookieFlag} ${headerFlags} --extract-audio --audio-format mp3 --format "${format}" --no-check-certificates --retries 3 -o "${tempFilePath}" "${cleanedUrl}"`;
//         runYtdlp(extractCmd);

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
//       errorMessage = "Invalid or unsupported URL format.";
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

const YTDLP_PATH =
  "/var/www/html/droppr.ai-backend/node_modules/yt-dlp-exec/bin/yt-dlp";
const COOKIES_DIR = "/var/www/html/droppr.ai-backend";

/**
 * Run yt-dlp asynchronously with --js-runtimes node
 */
const runYtdlp = async (args) => {
  console.log(`[yt-dlp] Running with args: ${args.join(" ")}`);
  try {
    const { stdout, stderr } = await execFileAsync(YTDLP_PATH, args, {
      timeout: 120000,
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    });
    return stdout;
  } catch (error) {
    const stderr = error.stderr || "";
    const stdout = error.stdout || "";
    console.error("[yt-dlp] stderr:", stderr);
    throw new Error(stderr || stdout || error.message);
  }
};

/**
 * Clean and normalize social media URLs
 */
const cleanUrl = (url) => {
  const cleanedUrl = url.split("?")[0].split("#")[0];

  if (cleanedUrl.includes("instagram.com")) {
    const reelMatch = cleanedUrl.match(/\/reel[s]?\/([A-Za-z0-9_-]+)/);
    const pMatch = cleanedUrl.match(/\/p\/([A-Za-z0-9_-]+)/);
    if (reelMatch) return `https://www.instagram.com/reel/${reelMatch[1]}/`;
    if (pMatch) return `https://www.instagram.com/p/${pMatch[1]}/`;
  }

  if (cleanedUrl.includes("tiktok.com")) {
    return cleanedUrl.split("?")[0];
  }

  return cleanedUrl;
};

/**
 * Detect platform from URL
 */
const detectPlatform = (url) => {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("tiktok.com")) return "tiktok";
  if (url.includes("instagram.com")) return "instagram";
  return "unknown";
};

/**
 * Get cookie file path for platform
 */
const getCookiePath = (platform) => {
  const cookieMap = {
    youtube: `${COOKIES_DIR}/youtube-cookies.txt`,
    instagram: `${COOKIES_DIR}/instagram-cookies.txt`,
    tiktok: `${COOKIES_DIR}/tiktok-cookies.txt`,
  };

  const cookiePath = cookieMap[platform];
  if (cookiePath && fs.existsSync(cookiePath)) {
    console.log(`[${platform}] ✓ Using cookies: ${cookiePath}`);
    return cookiePath;
  }

  console.warn(`[${platform}] ⚠ No cookie file found`);
  return null;
};

/**
 * Build base args array (shared options)
 */
const getBaseArgs = (platform, cookiePath) => {
  const args = ["--js-runtimes", "node", "--no-check-certificates"];

  // Add cookies
  if (cookiePath) {
    args.push("--cookies", cookiePath);
  }

  // Platform-specific headers
  if (platform === "youtube") {
    args.push(
      "--add-header",
      "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "--add-header",
      "Accept-Language:en-US,en;q=0.9",
    );
  } else if (platform === "instagram") {
    args.push(
      "--add-header",
      "User-Agent:Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
      "--add-header",
      "Referer:https://www.instagram.com/",
      "--add-header",
      "X-IG-App-ID:936619743392459",
    );
  } else if (platform === "tiktok") {
    args.push(
      "--add-header",
      "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "--add-header",
      "Referer:https://www.tiktok.com/",
    );
  }

  return args;
};

/**
 * Extracts audio from a social media link and uploads to S3
 */
export const extractAndUploadAudio = async (userId, videoUrl) => {
  const tempDir = os.tmpdir();
  const baseFileName = `social_audio_${Date.now()}`;
  const tempFilePath = path.join(tempDir, `${baseFileName}.mp3`);
  let thumbnail = null;
  let title = "No Title";
  let description = "No Description";
  let creatorAttribution = null;

  try {
    const cleanedUrl = cleanUrl(videoUrl);
    const platform = detectPlatform(cleanedUrl);
    console.log(`[Social] Processing: ${cleanedUrl} (Platform: ${platform})`);

    const cookiePath = getCookiePath(platform);
    const baseArgs = getBaseArgs(platform, cookiePath);

    // ===== FETCH METADATA =====
    try {
      console.log(`[${platform}] Fetching metadata...`);

      const metaArgs = [...baseArgs, "--dump-json", cleanedUrl];
      const metaOutput = await runYtdlp(metaArgs);
      const parsedMetadata = JSON.parse(metaOutput);

      title =
        parsedMetadata.title || parsedMetadata.description || "Social Video";
      description =
        parsedMetadata.description || parsedMetadata.title || "No Description";
      thumbnail =
        parsedMetadata.thumbnail || parsedMetadata.thumbnails?.[0]?.url || null;
      creatorAttribution =
        parsedMetadata.uploader || parsedMetadata.channel || null;

      console.log(`[${platform}] ✓ Title: ${title.substring(0, 50)}`);
      console.log(
        `[${platform}] ✓ Creator: ${creatorAttribution || "Unknown"}`,
      );
    } catch (metaError) {
      console.warn(`[${platform}] ⚠ Metadata failed:`, metaError.message);
    }

    // ===== EXTRACT AUDIO WITH FORMAT FALLBACKS =====
    console.log(`[${platform}] Extracting audio...`);

    const formats = [
      "bestaudio/best",
      "best",
      "bestvideo+bestaudio/best",
      "worst",
    ];
    let extracted = false;

    for (const format of formats) {
      try {
        console.log(`[${platform}] Trying format: ${format}...`);

        const extractArgs = [
          ...baseArgs,
          "--extract-audio",
          "--audio-format",
          "mp3",
          "--format",
          format,
          "--retries",
          "3",
          "-o",
          tempFilePath,
          cleanedUrl,
        ];

        await runYtdlp(extractArgs);

        if (fs.existsSync(tempFilePath) && fs.statSync(tempFilePath).size > 0) {
          extracted = true;
          console.log(`[${platform}] ✓ Format "${format}" worked!`);
          break;
        }
      } catch (formatError) {
        console.warn(
          `[${platform}] ⚠ Format "${format}" failed:`,
          formatError.message,
        );
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        continue;
      }
    }

    if (!extracted) {
      throw new Error("All format attempts failed - video may be unavailable");
    }

    const fileSize = fs.statSync(tempFilePath).size;
    console.log(
      `[${platform}] ✓ Extracted (${(fileSize / 1024 / 1024).toFixed(2)} MB)`,
    );

    // ===== UPLOAD TO S3 =====
    console.log(`[${platform}] Uploading to S3...`);
    const fileStream = fs.createReadStream(tempFilePath);
    const s3Key = `campaigns/${userId}/${path.basename(tempFilePath)}`;

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
    const s3Url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    console.log(`[${platform}] ✓ Success! ${s3Url}`);

    return {
      audioUrl: s3Url,
      videoThumbnail: thumbnail,
      title: title.substring(0, 200),
      description: description.substring(0, 500),
      creatorAttribution,
      localFilePath: tempFilePath,
    };
  } catch (error) {
    console.error("[Social Error] ✗", error.message);

    if (fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch {}
    }

    let errorMessage = error.message;
    if (
      error.message.includes("Sign in") ||
      error.message.includes("not a bot")
    ) {
      errorMessage = "YouTube auth failed. Re-export cookies.";
    } else if (error.message.includes("Unsupported URL")) {
      errorMessage = "Invalid or unsupported URL.";
    } else if (error.message.includes("Private")) {
      errorMessage = "Content is private.";
    }

    throw new Error(`Failed to extract audio: ${errorMessage}`);
  }
};
