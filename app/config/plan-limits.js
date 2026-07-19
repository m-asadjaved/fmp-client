export const PLAN_LIMITS = {
  free: {
    creditsPerMonth: 1,
    maxStorageGB: 2,
    maxActiveProjects: 5,
    maxRawUploadLengthSeconds: 60 * 10, // 10 mins
    maxExportDurationSeconds: 60, // 1 min clip
    features: ["basic_templates"]
  },
  pro: {
    creditsPerMonth: 30,
    maxStorageGB: 10,
    maxActiveProjects: 20,
    maxRawUploadLengthSeconds: 60 * 60, // 1 hour
    maxExportDurationSeconds: 120, // 2 min clip
    features: ["basic_templates", "remove_watermark"]
  },
  expert: {
    creditsPerMonth: 70,
    maxStorageGB: 50,
    maxActiveProjects: 100,
    maxRawUploadLengthSeconds: 60 * 60 * 3, // 3 hours
    maxExportDurationSeconds: 300, // 5 min clip
    features: ["basic_templates", "remove_watermark", "4k_export"]
  },
  business: {
    creditsPerMonth: 150,
    maxStorageGB: 200,
    maxActiveProjects: -1, // -1 indicates unlimited
    maxRawUploadLengthSeconds: -1, // Unlimited
    maxExportDurationSeconds: -1, // Unlimited
    features: ["basic_templates", "remove_watermark", "4k_export", "api_access", "priority_support"]
  }
};
