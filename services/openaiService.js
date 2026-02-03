import OpenAI from "openai";
import Campaign from "../models/Campaign.js";
import fs from "fs";
import path from "path";
import os from "os";
import https from "https";
import { pipeline } from "stream";
import { promisify } from "util";

const streamPipeline = promisify(pipeline);
import { exec } from "child_process";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Comprehensive system prompt for article generation
 * Combines all requirements: fact extraction, press-style writing, SEO, compliance
 */
const ARTICLE_GENERATION_PROMPT = `You are a newsroom-trained editor producing publishable, commercially effective press releases for distribution on traditional media sites, wire services, and high-authority digital publishers.

Your task is to convert short-form social video content created by a creator or influencer into an infomercial-style news release that:
- Reads like legitimate editorial content
- Is acceptable for publication on traditional media sites
- Is indexable by search engines
- Drives product awareness and conversion through credibility, context, and trust

You must balance editorial tone with commercial intent.
The release should persuade implicitly, never appear as an advertisement, and never resemble direct-response marketing.

CORE EDITORIAL PRINCIPLES:
- Treat the video as a primary source and proof of use, not an ad.
- Persuasion must be credibility-driven and benefit-oriented.
- Allow positive product framing when grounded in demonstrated use or experience.
- Avoid hype, slogans, pricing language, discounts, or calls to action.
- Write so the release could plausibly appear in a product, lifestyle, or consumer-interest section.
- Use active voice and third person only.

MANDATORY MEDIA & COMMERCIAL ELEMENTS:
- Your response must provide data for:
  1. Headlines (Catchy, news-style)
  2. Location|Date context
  3. Introduction (Hook)
  4. Body (Narrative-style reportage)
  5. Product Summary (Category, Use Case, Positioning)
  6. **Product Name**: A precise, concise name for the featured product (3-5 words max).
  7. Creator Quote: At least one authentic-sounding quote focused on experience/outcome.
  8. **Affiliate Link**: If a video description is provided, extract the most likely affiliate, product, or shop link URL. If none found, leave as null.
  9. CTA Text: A direct but informational product reference.
  10. Conclusion: A final reinforcing paragraph.

SAFETY & POLICY CHECK:
If the content of the transcript involves:
- Illegal activities or substances
- Explicit sexual content or extreme violence
- Real-world harmful misinformation
- Significant policy violations
Return a JSON object with ONLY this structure:
{
  "success": false,
  "errorType": "SAFETY_VIOLATION",
  "message": "Explicit content, article generation prohibited"
}

OUTPUT FORMAT:
Return a JSON object with this structure:
{
  "success": true,
  "headline": "...",
  "productName": "...",
  "locationDate": "...",
  "introduction": "...",
  "body": "...",
  "creatorQuote": "...",
  "productSummary": {
    "category": "...",
    "useCase": "...",
    "positioning": "..."
  },
  "affiliateLink": "...",
  "ctaText": "...",
  "conclusion": "..."
}`;

/**
 * Transcribe video using OpenAI Whisper API
 */
/**
 * Transcribe video using OpenAI Whisper API
 */
export const transcribeVideo = async (campaignId, localFilePath = null) => {
  let tempFilePath = localFilePath;
  let ownTempFile = false;
  try {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new Error("Campaign not found");

    const videoUrl = campaign.audioUrl || campaign.videoUrl;

    if (tempFilePath) {
      console.log("Using provided local file for transcription:", tempFilePath);
    } else {
      console.log("No local file provided, downloading from:", videoUrl);
      ownTempFile = true;
      // 1. Create a temporary file path
      const urlObj = new URL(videoUrl);
      const ext = path.extname(urlObj.pathname) || ".mp4";
      const tempDir = os.tmpdir();
      const fileName = `upload_${Date.now()}${ext}`;
      tempFilePath = path.join(tempDir, fileName);

      // 2. Download the file
      await new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(tempFilePath);
        https
          .get(videoUrl, (response) => {
            if (response.statusCode !== 200) {
              reject(new Error(`Failed to download video. Status Code: ${response.statusCode}`));
              return;
            }
            response.pipe(fileStream);
            fileStream.on("finish", () => {
              fileStream.close();
              resolve();
            });
            fileStream.on("error", (err) => {
              fs.unlink(tempFilePath, () => { });
              reject(err);
            });
          })
          .on("error", (err) => {
            fs.unlink(tempFilePath, () => { });
            reject(err);
          });
      });
    }

    // Check file size (Whisper limit is ~25MB)
    const stats = fs.statSync(tempFilePath);
    const fileSizeInMegabytes = stats.size / (1024 * 1024);
    console.log(`Processing file for Whisper. Size: ${fileSizeInMegabytes.toFixed(2)} MB`);

    if (fileSizeInMegabytes > 25) {
      throw new Error("Video file is too large for Whisper API (Max 25MB).");
    }

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1",
      response_format: "text",
    });

    return transcription;
  } finally {
    if (ownTempFile && tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log("Internal temp file cleaned up");
      } catch (e) {
        console.error("Cleanup error:", e);
      }
    }
  }
};

/**
 * Generate article from transcript using single LLM call
 */
export const generateArticleFromTranscript = async (rawTranscript, videoDescription = "") => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: ARTICLE_GENERATION_PROMPT,
        },
        {
          role: "user",
          content: `VIRTUAL SOURCE CONTENT:
TRANSCRIPT:
${rawTranscript}

${videoDescription ? `ORIGINAL VIDEO DESCRIPTION:\n${videoDescription}` : ''}

Please generate a professional press article and product metadata based on this content.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000,
    });

    const result = JSON.parse(completion.choices[0].message.content);

    if (!result.success) {
      throw new Error(result.error || "Failed to generate article");
    }

    return result;
  } catch (error) {
    console.error("Article generation error:", error);
    throw error;
  }
};

/**
 * Main function to transcribe video and generate article
 */
export const transcribeAndGenerate = async (campaignId, options = {}) => {
  const { localFilePath = null, videoDescription = "" } = options;
  try {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new Error("Campaign not found");

    // Step 1: Transcribe video
    campaign.status = "transcribing";
    await campaign.save();
    const rawTranscript = await transcribeVideo(campaignId, localFilePath);
    campaign.rawTranscript = rawTranscript;
    campaign.status = "generating";
    await campaign.save();

    // QUALITY CHECK: Is transcript too short?
    if (!rawTranscript || rawTranscript.trim().length < 20) {
      throw new Error("Content is not enough for generating article");
    }

    // 3. Generate Article Content
    const result = await generateArticleFromTranscript(rawTranscript, videoDescription);

    // SAFETY CHECK: Did AI flag it?
    if (result.success === false && result.errorType === "SAFETY_VIOLATION") {
      throw new Error(result.message || "Explicit content, article generation prohibited");
    }

    // 4. Update Campaign with results
    campaign.article = {
      headline: result.headline,
      locationDate: result.locationDate,
      introduction: result.introduction,
      body: result.body,
      ctaText: result.ctaText,
      conclusion: result.conclusion,
      creatorQuote: result.creatorQuote,
      productSummary: result.productSummary,
    };

    campaign.productCard = {
      ...campaign.productCard,
      productName: result.productName,
      affiliateLink: result.affiliateLink || campaign.productCard?.affiliateLink,
    };

    campaign.status = "finished";
    await campaign.save();

    return campaign;
  } catch (error) {
    console.error("Transcribe and generate error:", error);
    const campaign = await Campaign.findById(campaignId);
    if (campaign) {
      campaign.status = "failed";
      campaign.errorMessage = error.message;
      await campaign.save();
    }
    throw error;
  }
};

/**
 * Perform campaign-aware edits for specific sections
 */
export const campaignAwareEdit = async (campaignData, actionId) => {
  const { article, context, productCard, rawTranscript } = campaignData;

  let actionPrompt = "";
  switch (actionId) {
    case "REWRITE_WITH_CONTEXT":
      actionPrompt = "Rewrite the entire article incorporating the updated context and product details. Maintain the structure.";
      break;
    case "OPTIMIZE_HEADLINE":
      actionPrompt = "Only optimize the HEADLINE for maximum engagement based on the campaign goal. Return the full object with only the headline updated.";
      break;
    case "EXPAND_LEDE":
      actionPrompt = "Expand the INTRODUCTION (Lede) to be more descriptive and engaging. Return the full object with only the introduction updated.";
      break;
    case "CONDENSE_BODY":
      actionPrompt = "Condense the MAIN BODY to be more concise while keeping all key facts. Return the full object with only the body updated.";
      break;
    case "IMPROVE_NARRATIVE_FLOW":
      actionPrompt = "Improve the narrative flow between paragraphs in the BODY. Return the full object with only the body updated.";
      break;
    case "OPTIMIZE_FOR_CONVERSION":
      actionPrompt = "Optimize the CTA TEXT and the positioning in PRODUCT SUMMARY for higher conversion. Return the full object with those updated.";
      break;
    default:
      actionPrompt = "Refine the article based on available context.";
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: ARTICLE_GENERATION_PROMPT,
        },
        {
          role: "user",
          content: `CURRENT ARTICLE: ${JSON.stringify(article)}
CONTEXT: ${JSON.stringify(context)}
PRODUCT: ${JSON.stringify(productCard)}
TRANSCRIPT: ${rawTranscript}

ACTION: ${actionPrompt}
Return the updated JSON object matching the standard structure.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(completion.choices[0].message.content);
    return result;
  } catch (error) {
    console.error("AI Edit error:", error);
    throw error;
  }
};
