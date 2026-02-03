import Campaign from "../../models/Campaign.js";
import {
    transcribeAndGenerate,
    campaignAwareEdit,
} from "../../services/openaiService.js";
import { extractAndUploadAudio } from "../../services/socialMediaService.js";
import { Upload } from "@aws-sdk/lib-storage";
import s3Client from "../../config/s3.js";
import fs from "fs";
import path from "path";
import os from "os";

// Create a new campaign (Local Upload Only)
export const createCampaign = async (req, res) => {
    try {
        const { userId, metadata } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }

        const campaign = await Campaign.create({
            userId,
            videoSource: "local_upload",
            status: "uploading",
            metadata: metadata || {},
        });

        return res.status(201).json({
            success: true,
            message: "Campaign created successfully",
            data: campaign,
        });
    } catch (error) {
        console.error("Error creating campaign:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create campaign",
            error: error.message,
        });
    }
};

/**
 * Handle Campaign creation from social link
 */
export const createCampaignFromLink = async (req, res) => {
    try {
        const { userId, videoUrl } = req.body;

        if (!userId || !videoUrl) {
            return res.status(400).json({
                success: false,
                message: "User ID and Video URL are required",
            });
        }

        // Simple validation check
        const isYouTube =
            videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be");
        const isTikTok = videoUrl.includes("tiktok.com");
        const isInstagram = videoUrl.includes("instagram.com");

        if (!isYouTube && !isTikTok && !isInstagram) {
            return res.status(400).json({
                success: false,
                message:
                    "Unsupported social link platform. Please use YouTube, TikTok, or Instagram.",
            });
        }

        // Create the campaign record first
        const campaign = await Campaign.create({
            userId,
            videoSource: "social_link",
            status: "uploading", // It's "uploading" (extracting + S3 upload)
            videoUrl: videoUrl, // Original link
            productCard: {
                sourceVideoLink: videoUrl,
            },
        });

        // Trigger extraction in background
        extractAndUploadAudio(userId, videoUrl)
            .then(async (result) => {
                const { audioUrl, videoThumbnail, title, description, creatorAttribution, localFilePath } = result;

                // Update basic info
                campaign.audioUrl = audioUrl;
                if (videoThumbnail) campaign.videoThumbnail = videoThumbnail;

                campaign.productCard = {
                    ...campaign.productCard,
                    creatorAttribution: creatorAttribution || null,
                    sourceVideoLink: videoUrl
                };

                await campaign.save();

                // Start Transcription & Article Gen in background using the LOCAL file
                // This is the Parallel Flow Optimization!
                try {
                    await transcribeAndGenerate(campaign._id, {
                        localFilePath,
                        videoDescription: description || title
                    });
                    console.log(`[Flow] Parallel processing finished for campaign ${campaign._id}`);
                } catch (aiError) {
                    console.error(`[Flow] AI processing failed:`, aiError);
                    campaign.status = "failed";
                    campaign.errorMessage = aiError.message || "AI processing failed";
                    await campaign.save();
                } finally {
                    // CLEANUP: Done using the file for both S3 and AI
                    if (localFilePath && fs.existsSync(localFilePath)) {
                        fs.unlinkSync(localFilePath);
                        console.log(`[Flow] Cleaned up optimized local file: ${localFilePath}`);
                    }
                }
            })
            .catch(async (error) => {
                campaign.status = "failed";
                campaign.errorMessage = `Extraction failed: ${error.message}`;
                await campaign.save();
                console.error(`Extraction failed:`, error);
            });

        return res.status(201).json({
            success: true,
            message: "Social link received. Audio extraction started in background.",
            data: campaign,
        });
    } catch (error) {
        console.error("Error in social link handler:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to process social link",
            error: error.message,
        });
    }
};
// Update video URL after S3 upload
export const updateVideoUrl = async (req, res) => {
    try {
        const { id } = req.params;
        const { videoUrl, videoThumbnail } = req.body;

        if (!videoUrl) {
            return res.status(400).json({
                success: false,
                message: "Video URL is required",
            });
        }

        const campaign = await Campaign.findById(id);

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found",
            });
        }

        campaign.videoUrl = videoUrl;
        if (videoThumbnail) {
            campaign.videoThumbnail = videoThumbnail;
        }
        campaign.status = "uploaded";

        await campaign.save();

        // TODO: Trigger transcription process here
        // For now, we'll handle this separately

        return res.status(200).json({
            success: true,
            message: "Video URL updated successfully",
            data: campaign,
        });
    } catch (error) {
        console.error("Error updating video URL:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update video URL",
            error: error.message,
        });
    }
};

// Get campaign by ID
export const getCampaign = async (req, res) => {
    try {
        const { id } = req.params;

        const campaign = await Campaign.findById(id).populate(
            "userId",
            "name email",
        );

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: campaign,
        });
    } catch (error) {
        console.error("Error fetching campaign:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch campaign",
            error: error.message,
        });
    }
};

// Get all campaigns for a user
export const getUserCampaigns = async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }

        const campaigns = await Campaign.find({ userId }).sort({ createdAt: -1 }); // Include all fields including rawTranscript

        return res.status(200).json({
            success: true,
            data: campaigns,
        });
    } catch (error) {
        console.error("Error fetching user campaigns:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch campaigns",
            error: error.message,
        });
    }
};

// Update campaign article
export const updateCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const { article, metadata, status, errorMessage, productCard, context, videoThumbnail } =
            req.body;

        const campaign = await Campaign.findById(id);

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found",
            });
        }

        // Limit Check: Block article updates if 10 versions reached
        if (article && campaign.versions.length >= 10) {
            return res.status(403).json({
                success: false,
                message: "You have reached your maximum edits limit.",
            });
        }

        // Handle Article Update
        if (article) {
            campaign.article = {
                ...campaign.article,
                ...article,
            };
        }

        if (productCard) {
            campaign.productCard = {
                ...campaign.productCard,
                ...productCard,
            };
        }

        if (context) {
            campaign.context = {
                ...campaign.context,
                ...context,
            };
        }

        if (status) {
            campaign.status = status;
        }

        if (errorMessage) {
            campaign.errorMessage = errorMessage;
        }

        if (videoThumbnail) {
            campaign.videoThumbnail = videoThumbnail;
        }

        if (metadata) {
            campaign.metadata = {
                ...campaign.metadata,
                ...metadata,
            };
        }

        await campaign.save();

        return res.status(200).json({
            success: true,
            message: "Campaign updated successfully",
            data: campaign,
        });
    } catch (error) {
        console.error("Error updating campaign:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update campaign",
            error: error.message,
        });
    }
};

// Start transcription process
export const startTranscription = async (req, res) => {
    try {
        const { id } = req.params;

        const campaign = await Campaign.findById(id);

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found",
            });
        }

        if (!campaign.videoUrl) {
            return res.status(400).json({
                success: false,
                message: "Video URL is required to start transcription",
            });
        }

        campaign.status = "transcribing";
        await campaign.save();

        // Run transcription in background
        transcribeAndGenerate(campaign._id).catch((error) => {
            console.log("Transcription error:", error);
        });

        return res.status(200).json({
            success: true,
            message: "Transcription started",
            data: campaign,
        });
    } catch (error) {
        console.error("Error starting transcription:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to start transcription",
            error: error.message,
        });
    }
};

/**
 * Handle Optimized Local Upload (Stream & Branch)
 * Pipes incoming file to S3 and Local Temp simultaneously
 */
export const uploadOptimized = async (req, res) => {
    try {
        const { id } = req.params;
        const { chunkIndex, totalChunks, fileName } = req.body;

        const campaign = await Campaign.findById(id);
        if (!campaign) {
            return res.status(404).json({ success: false, message: "Campaign not found" });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: "No video file provided" });
        }

        let tempFilePath;
        let finalFileName = req.file.originalname;

        // Check if it's a chunked upload
        if (chunkIndex !== undefined && totalChunks !== undefined) {
            const idx = parseInt(chunkIndex);
            const total = parseInt(totalChunks);
            const chunkDir = path.join(os.tmpdir(), `chunks_${id}`);

            if (!fs.existsSync(chunkDir)) {
                fs.mkdirSync(chunkDir, { recursive: true });
            }

            const chunkPath = path.join(chunkDir, `chunk_${idx}`);
            fs.renameSync(req.file.path, chunkPath);

            // If it's NOT the last chunk, acknowledge receipt and stop
            if (idx < total - 1) {
                return res.status(200).json({
                    success: true,
                    message: `Chunk ${idx} received`,
                });
            }

            // --- LAST CHUNK ARRIVED: PREVENT CONCURRENT MERGING ---
            const lockFile = path.join(chunkDir, 'merging.lock');
            if (fs.existsSync(lockFile)) {
                console.log(`[Flow] Merge already in progress for campaign ${id}`);
                return res.status(200).json({ success: true, message: "Merge already handled" });
            }
            fs.writeFileSync(lockFile, '1');

            // Verify all chunks exist before merging
            for (let i = 0; i < total; i++) {
                if (!fs.existsSync(path.join(chunkDir, `chunk_${i}`))) {
                    console.error(`[Flow] Merge aborted: Chunk ${i} is missing for campaign ${id}`);
                    // Remove lock so it can be re-attempted if needed
                    if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
                    return res.status(200).json({ success: true, message: "Awaiting all chunks to be written" });
                }
            }

            // --- ALL CHUNKS PRESENT: PROCEED TO MERGE ---
            const mergedFileName = fileName || `video_${id}_${Date.now()}.mp4`;
            tempFilePath = path.join(os.tmpdir(), mergedFileName);
            finalFileName = mergedFileName;

            console.log(`[Flow] Merging ${total} chunks into: ${tempFilePath}`);
            const writeStream = fs.createWriteStream(tempFilePath);
            for (let i = 0; i < total; i++) {
                const chunkFile = path.join(chunkDir, `chunk_${i}`);
                const chunkData = fs.readFileSync(chunkFile);
                writeStream.write(chunkData);
                fs.unlinkSync(chunkFile);
            }
            writeStream.end();

            // Wait for merging to complete
            await new Promise((resolve, reject) => {
                writeStream.on("finish", resolve);
                writeStream.on("error", (err) => {
                    console.error("[Flow] WriteStream error during merge:", err);
                    reject(err);
                });
            });

            // Cleanup chunk directory
            if (fs.existsSync(chunkDir)) {
                fs.rmSync(chunkDir, { recursive: true, force: true });
            }
            console.log(`[Flow] Chunks successfully merged: ${tempFilePath}`);
        } else {
            // Standard Single File Upload
            const originalExt = path.extname(req.file.originalname) || ".mp4";
            tempFilePath = `${req.file.path}${originalExt}`;
            fs.renameSync(req.file.path, tempFilePath);
            console.log(`[Flow] Original single file received: ${tempFilePath}`);
        }

        // --- CONTINUE WITH S3 UPLOAD AND AI PROCESSING ---
        const s3FileName = `video_${id}_${Date.now()}${path.extname(finalFileName)}`;
        const s3Key = `campaigns/${campaign.userId}/videos/${s3FileName}`;

        console.log(`[Flow] Branching: S3 Upload (${s3Key}) and AI Transcription`);

        // 1. Upload to S3
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: s3Key,
                Body: fs.createReadStream(tempFilePath),
                ContentType: req.file.mimetype || "video/mp4",
            },
        });

        await upload.done();
        const s3Url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

        campaign.videoUrl = s3Url;
        campaign.status = "uploaded";
        await campaign.save();

        // 2. Trigger Transcription using the LOCAL file before deletion
        try {
            await transcribeAndGenerate(campaign._id, {
                localFilePath: tempFilePath
            });
            console.log(`[Flow] AI processing finished for campaign ${campaign._id}`);
        } catch (aiError) {
            console.error(`[Flow] AI processing failed:`, aiError);
            campaign.status = "failed";
            campaign.errorMessage = aiError.message || "AI processing failed";
            await campaign.save();
        } finally {
            // CLEANUP: Local file is done
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
                console.log(`[Flow] Cleaned up local temp file: ${tempFilePath}`);
            }
        }

        return res.status(200).json({
            success: true,
            message: "File processed and uploaded successfully",
            data: campaign
        });

    } catch (error) {
        console.error("Optimized upload error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Handle AI-powered article edits/regeneration
 */
export const handleAiEdit = async (req, res) => {
    try {
        const { id } = req.params;
        const { actionId } = req.body;

        const campaign = await Campaign.findById(id);

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found",
            });
        }

        // Limit Check: Block AI edits if 10 versions reached
        if (campaign.versions.length >= 10) {
            return res.status(403).json({
                success: false,
                message: "You have reached your maximum edits limit.",
            });
        }

        const updatedArticle = await campaignAwareEdit(campaign, actionId);

        // Auto-versioning: Save current state before updating
        if (campaign.article && campaign.article.headline) {
            campaign.versions.unshift({
                article: campaign.article,
                createdAt: new Date(),
            });
            if (campaign.versions.length > 10) campaign.versions.pop();
        }

        campaign.article = updatedArticle;
        await campaign.save();

        return res.status(200).json({
            success: true,
            message: "AI Edit completed successfully",
            data: campaign,
        });
    } catch (error) {
        console.error("Error in AI Edit:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to perform AI Edit",
            error: error.message,
        });
    }
};

// Helper to sync metadata to productCard if empty
const syncProductMetadata = (campaign, result = {}) => {
    if (!campaign.productCard) campaign.productCard = {};

    // Auto-fill from transcription result if card fields are empty
    if (result.productName && !campaign.productCard.productName) {
        campaign.productCard.productName = result.productName;
    }
    if (result.affiliateLink && !campaign.productCard.affiliateLink) {
        campaign.productCard.affiliateLink = result.affiliateLink;
    }

    // Sync thumbnail if top-level exists but card-level doesn't
    if (campaign.videoThumbnail && !campaign.productCard.thumbnail) {
        campaign.productCard.thumbnail = campaign.videoThumbnail;
    }
};

/**
 * Handle Thumbnail Upload
 */

export const uploadThumbnail = async (req, res) => {
    try {
        const { id } = req.params;
        const { thumbnailUrl } = req.body; // For live URL case

        const campaign = await Campaign.findById(id);
        if (!campaign) {
            return res.status(404).json({ success: false, message: "Campaign not found" });
        }

        if (thumbnailUrl) {
            // Case 1: Provided live URL
            campaign.videoThumbnail = thumbnailUrl;
            if (campaign.productCard) campaign.productCard.thumbnail = thumbnailUrl;
            await campaign.save();
            return res.status(200).json({ success: true, data: campaign });
        }

        if (req.file) {
            // Case 2: Uploaded file via Multer
            const fileName = `thumb_${id}_${Date.now()}${path.extname(req.file.originalname)}`;
            const s3Key = `campaigns/${campaign.userId}/thumbnails/${fileName}`;

            const upload = new Upload({
                client: s3Client,
                params: {
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: s3Key,
                    Body: fs.createReadStream(req.file.path),
                    ContentType: req.file.mimetype,
                },
            });

            await upload.done();
            const s3Url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

            campaign.videoThumbnail = s3Url;
            if (campaign.productCard) campaign.productCard.thumbnail = s3Url;

            await campaign.save();

            // Cleanup local multer temp file
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }

            return res.status(200).json({
                success: true,
                message: "Thumbnail uploaded successfully",
                data: campaign
            });
        }

        return res.status(400).json({ success: false, message: "No thumbnail provided" });

    } catch (error) {
        console.error("Thumbnail upload error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Delete campaign
export const deleteCampaign = async (req, res) => {
    try {
        const { id } = req.params;

        const campaign = await Campaign.findByIdAndDelete(id);

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Campaign deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting campaign:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete campaign",
            error: error.message,
        });
    }
};
