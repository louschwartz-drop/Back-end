import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    videoSource: {
      type: String,
      enum: ["local_upload", "social_link"],
      default: "local_upload",
      required: true,
    },
    videoUrl: {
      type: String,
      default: null,
    },
    videoThumbnail: {
      type: String,
      default: null,
    },
    audioUrl: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: [
        "uploading",
        "uploaded",
        "transcribing",
        "generating",
        "finished",
        "failed",
      ],
      default: "uploading",
      required: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    rawTranscript: {
      type: String,
      default: null,
    },
    article: {
      headline: { type: String, default: null },
      locationDate: { type: String, default: null },
      introduction: { type: String, default: null },
      body: { type: String, default: null },
      creatorQuote: { type: String, default: null },
      productSummary: {
        category: { type: String, default: null },
        useCase: { type: String, default: null },
        positioning: { type: String, default: null },
      },
      ctaText: { type: String, default: null },
      conclusion: { type: String, default: null },
    },
    productCard: {
      productName: { type: String, default: null },
      thumbnail: { type: String, default: null },
      affiliateLink: { type: String, default: null },
      creatorAttribution: { type: String, default: null },
      sourceVideoLink: { type: String, default: null },
    },
    context: {
      tone: { type: String, default: "Informative" },
      goal: { type: String, default: "Awareness" },
      publisherTier: { type: String, default: "Standard" },
    },
    versions: [
      {
        article: Object,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    metadata: {
      companyName: String,
      location: String,
      category: String,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for efficient queries
campaignSchema.index({ userId: 1, createdAt: -1 });
campaignSchema.index({ status: 1 });

const Campaign =
  mongoose.models.Campaign || mongoose.model("Campaign", campaignSchema);

export default Campaign;
